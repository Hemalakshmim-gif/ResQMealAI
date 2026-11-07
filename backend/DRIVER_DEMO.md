# Driver demo account

The driver pages load deliveries assigned to the authenticated driver. To create
a teacher/demo account with its own records, configure `MONGODB_URI` and
`DEMO_DRIVER_PASSWORD` in `backend/.env`, then run:

```powershell
cd backend
npm run seed:driver-demo
```

The seed command creates or refreshes `demo.driver@nourivya.test`, along with
sample assigned and delivered deliveries. Use the same
`DEMO_DRIVER_PASSWORD` value on the main login page and select **Delivery
Driver**. The account and records persist in MongoDB across logins; logging out
only clears the browser session.

The script is repeatable, only updates records it marked as demo data, and
refuses to run with `NODE_ENV=production`. Demo records are excluded from
impact analytics. No database changes happen until the seed command is run.
