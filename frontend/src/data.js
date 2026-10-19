export const INITIAL_DATA = {
  inventory: [
    { id: 'INV-101', name: 'Artisan Sourdough Loaves', category: 'Bakery', quantity: 45, unit: 'loaves', prepTime: '2026-10-10 08:00', expiryTime: '2026-10-12 18:00', temp: 'Room Temp', storage: 'Pantry Shelves', location: 'Downtown Bakery #4', safety: 'SAFE', donationStatus: 'Available' },
    { id: 'INV-102', name: 'Organic Mixed Green Salads', category: 'Produce', quantity: 30, unit: 'bowls', prepTime: '2026-10-10 11:30', expiryTime: '2026-10-11 14:00', temp: 'Chilled (4°C)', storage: 'Walk-in Cooler A', location: 'Grand Hotel Kitchen', safety: 'URGENT', donationStatus: 'Matched' },
    { id: 'INV-103', name: 'Grilled Chicken Meal Boxes', category: 'Prepared Meals', quantity: 65, unit: 'boxes', prepTime: '2026-10-10 12:00', expiryTime: '2026-10-11 20:00', temp: 'Warm (65°C)', storage: 'Thermal Cabinet', location: 'University Cafeteria', safety: 'SAFE', donationStatus: 'In Transit' },
    { id: 'INV-104', name: 'Fresh Dairy Milk (1L)', category: 'Dairy', quantity: 20, unit: 'cartons', prepTime: '2026-10-09 06:00', expiryTime: '2026-10-11 08:00', temp: 'Refrigerated (2°C)', storage: 'Dairy Cold Room', location: 'FreshMart Supermarket', safety: 'URGENT', donationStatus: 'Available' },
    { id: 'INV-105', name: 'Assorted Gourmet Pastries', category: 'Bakery', quantity: 15, unit: 'boxes', prepTime: '2026-10-08 05:00', expiryTime: '2026-10-09 12:00', temp: 'Room Temp', storage: 'Display Case', location: 'Cafe Delight', safety: 'UNSAFE', donationStatus: 'Expired' }
  ],
  donations: [
    { id: 'DON-301', provider: 'Grand Hotel Kitchen', recipient: 'Hope Community Shelter', items: 'Organic Mixed Green Salads (30 bowls)', quantity: '30 bowls', date: '2026-10-10 12:15', status: 'Ready for Pickup', deliveryStatus: 'Assigned Driver' },
    { id: 'DON-302', provider: 'University Cafeteria', recipient: 'St. Mary Food Bank', items: 'Grilled Chicken Meal Boxes (65 boxes)', quantity: '65 boxes', date: '2026-10-10 10:30', status: 'In Transit', deliveryStatus: 'On the Way (ETA 12m)' },
    { id: 'DON-303', provider: 'Downtown Bakery #4', recipient: 'Community Kids Kitchen', items: 'Artisan Sourdough Loaves (45 loaves)', quantity: '45 loaves', date: '2026-10-09 16:45', status: 'Delivered', deliveryStatus: 'Completed successfully' }
  ],
  drivers: [
    { id: 'DRV-01', name: 'Marcus Vance', vehicle: 'Refrigerated Van (EV-04)', capacity: '250 kg', status: 'On Delivery', rating: '4.9/5' },
    { id: 'DRV-02', name: 'Elena Rostova', vehicle: 'Cargo E-Bike (CB-12)', capacity: '80 kg', status: 'Available', rating: '4.8/5' },
    { id: 'DRV-03', name: 'Devon Miller', vehicle: 'Standard Delivery Van (VN-09)', capacity: '300 kg', status: 'Available', rating: '4.7/5' }
  ],
  deliveries: [
    { id: 'DEL-501', donationId: 'DON-301', provider: 'Grand Hotel Kitchen', recipient: 'Hope Community Shelter', driver: 'Elena Rostova', vehicle: 'Cargo E-Bike (CB-12)', distance: '3.4 km', eta: '18 mins', status: 'Awaiting Pickup' },
    { id: 'DEL-502', donationId: 'DON-302', provider: 'University Cafeteria', recipient: 'St. Mary Food Bank', driver: 'Marcus Vance', vehicle: 'Refrigerated Van (EV-04)', distance: '7.1 km', eta: '12 mins', status: 'In Transit' }
  ],
  agents: [
    { id: 'AG-1', name: 'Surplus Prediction Agent', purpose: 'Forecasts daily surplus based on historical POS data & footfall.', status: 'Running', lastActivity: '2 mins ago', summary: 'Predicted +18% surplus for dinner service across 12 connected providers.' },
    { id: 'AG-2', name: 'Safety & Quality Agent', purpose: 'Analyzes temperature logs & time-to-expiry ratios.', status: 'Completed', lastActivity: '5 mins ago', summary: 'Scanned 142 items; flagged 3 batches requiring expedited redistribution.' },
    { id: 'AG-3', name: 'Demand Matching Agent', purpose: 'Aligns surplus item profiles with recipient nutritional requests.', status: 'Running', lastActivity: '1 min ago', summary: 'Matched 45 bakery loaves with Hope Shelter (94% compatibility score).' },
    { id: 'AG-4', name: 'Negotiation & Allocation Agent', purpose: 'Automates fair-share priority scoring & claim allocation.', status: 'Idle', lastActivity: '14 mins ago', summary: 'Allocated 30 salad bowls to St. Mary Food Bank without contention.' },
    { id: 'AG-5', name: 'Logistics Coordination Agent', purpose: 'Optimizes routes and assigns zero-emission vehicles.', status: 'Running', lastActivity: '3 mins ago', summary: 'Assigned Driver Marcus Vance to delivery DEL-502 with optimized multi-stop routing.' },
    { id: 'AG-6', name: 'Monitoring Agent', purpose: 'Tracks live transit conditions, traffic anomalies, & thermal breaches.', status: 'Running', lastActivity: 'Real-time', summary: 'All active transit nodes stable. 0 temperature violations detected.' },
    { id: 'AG-7', name: 'Replanning Agent', purpose: 'Instantly recalculates alternative routes upon driver cancellation or delay.', status: 'Waiting', lastActivity: '1 hr ago', summary: 'Successfully rerouted incident INC-882 in 4.2 seconds with zero food spoilage.' }
  ],
  incidents: [
    { id: 'INC-882', type: 'Driver Cancellation', donationId: 'DON-301', detectedAt: '10 mins ago', severity: 'High', status: 'Pending Approval', description: 'Driver vehicle breakdown reported 2.1km from pickup point. Replanning agent formulated alternative electric cargo bike.' }
  ],
  notifications: []
};;
