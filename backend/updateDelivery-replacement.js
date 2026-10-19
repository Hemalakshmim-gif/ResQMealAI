const updateDelivery = async (req, res) => {
  let session;

  try {
    const { id } = req.params;

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid delivery ID"
      });
    }

    const allowedFields = [
      "status",
      "notes",
      "failureReason",
      "plannedPickupAt"
    ];

    const updates = {};

    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) {
        updates[field] = req.body[field];
      }
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        success: false,
        message: "Provide at least one valid field to update"
      });
    }

    session = await mongoose.startSession();

    await session.withTransaction(async () => {
      const currentDelivery = await Delivery.findById(id).session(session);

      if (!currentDelivery) {
        const error = new Error("Delivery not found");
        error.statusCode = 404;
        throw error;
      }

      const allowedTransitions = {
        pending: ["assigned", "cancelled", "failed"],
        assigned: ["picked_up", "cancelled", "failed"],
        picked_up: ["in_transit", "delivered", "failed"],
        in_transit: ["delivered", "failed"],
        failed: ["pending", "assigned", "cancelled"],
        delivered: [],
        cancelled: []
      };

      if (updates.status) {
        if (
          !allowedTransitions[currentDelivery.status]?.includes(updates.status)
        ) {
          const error = new Error(
            `Cannot change delivery status from ${currentDelivery.status} to ${updates.status}`
          );
          error.statusCode = 400;
          throw error;
        }

        if (updates.status === "picked_up") {
          updates.pickedUpAt = new Date();
        }

        if (updates.status === "delivered") {
          updates.deliveredAt = new Date();
        }

        if (
          updates.status === "failed" &&
          !(
            typeof updates.failureReason === "string" &&
            updates.failureReason.trim()
          ) &&
          !(
            typeof currentDelivery.failureReason === "string" &&
            currentDelivery.failureReason.trim()
          )
        ) {
          const error = new Error(
            "Provide a failureReason when marking delivery as failed"
          );
          error.statusCode = 400;
          throw error;
        }

        if (updates.status === "assigned" && !currentDelivery.driver) {
          const error = new Error(
            "Cannot assign this delivery because it has no linked driver"
          );
          error.statusCode = 400;
          throw error;
        }
      }

      let linkedDonation = null;

      if (
        updates.status === "picked_up" ||
        updates.status === "delivered"
      ) {
        linkedDonation = await Donation.findById(
          currentDelivery.donation
        ).session(session);

        if (!linkedDonation) {
          const error = new Error("Linked donation not found");
          error.statusCode = 409;
          throw error;
        }

        if (
          updates.status === "picked_up" &&
          !["accepted", "preparing", "picked_up"].includes(
            linkedDonation.status
          )
        ) {
          const error = new Error(
            `Cannot mark delivery as picked up while donation status is '${linkedDonation.status}'`
          );
          error.statusCode = 400;
          throw error;
        }

        if (
          updates.status === "delivered" &&
          !["picked_up", "delivered"].includes(linkedDonation.status)
        ) {
          const error = new Error(
            `Cannot complete delivery while donation status is '${linkedDonation.status}'`
          );
          error.statusCode = 400;
          throw error;
        }
      }

      // Claim the linked driver in the same transaction.
      if (updates.status === "assigned") {
        const claimedDriver = await Driver.findOneAndUpdate(
          {
            _id: currentDelivery.driver,
            status: "available"
          },
          {
            $set: { status: "assigned" }
          },
          {
            session,
            returnDocument: "after",
            runValidators: true
          }
        );

        if (!claimedDriver) {
          const existingDriver = await Driver.findById(
            currentDelivery.driver
          ).session(session);

          if (!existingDriver) {
            const error = new Error("Linked driver not found");
            error.statusCode = 404;
            throw error;
          }

          const error = new Error(
            "Linked driver is not available for reassignment"
          );
          error.statusCode = 400;
          throw error;
        }
      }

      // Compare the previous status to avoid overwriting a concurrent update.
      const delivery = await Delivery.findOneAndUpdate(
        {
          _id: id,
          status: currentDelivery.status
        },
        {
          $set: updates
        },
        {
          session,
          returnDocument: "after",
          runValidators: true
        }
      );

      if (!delivery) {
        const error = new Error(
          "Delivery changed during this request. Please fetch it and retry."
        );
        error.statusCode = 409;
        throw error;
      }

      // Synchronize donation progress within the same transaction.
      if (linkedDonation && updates.status === "picked_up") {
        if (["accepted", "preparing"].includes(linkedDonation.status)) {
          linkedDonation.status = "picked_up";
          await linkedDonation.save({ session });
        }
      }

      if (
        linkedDonation &&
        updates.status === "delivered" &&
        linkedDonation.status === "picked_up"
      ) {
        linkedDonation.status = "delivered";
        linkedDonation.deliveredAt = new Date();
        await linkedDonation.save({ session });
      }

      // Release the driver when the delivery ends or fails.
      if (
        ["delivered", "cancelled", "failed"].includes(updates.status) &&
        currentDelivery.driver
      ) {
        await Driver.findOneAndUpdate(
          {
            _id: currentDelivery.driver,
            status: "assigned"
          },
          {
            $set: { status: "available" }
          },
          { session }
        );
      }
    });

    // Fetch populated data only after the transaction commits.
    const result = await Delivery.findById(id)
      .populate("donation")
      .populate("driver");

    if (!result) {
      return res.status(404).json({
        success: false,
        message: "Delivery not found after update"
      });
    }

    return res.status(200).json({
      success: true,
      message: "Delivery updated successfully",
      data: result
    });
  } catch (error) {
    if (error.statusCode) {
      return res.status(error.statusCode).json({
        success: false,
        message: error.message
      });
    }

    return res.status(500).json({
      success: false,
      message: "Could not update delivery",
      error: error.message
    });
  } finally {
    if (session) {
      await session.endSession().catch((error) => {
        console.error("Could not close delivery transaction session:", error.message);
      });
    }
  }
};


