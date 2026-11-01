// =============================================
// FleetPro – Sample Data Store
// =============================================

const DB = {
  owner: {
    name: 'Lalu Prasad',
    business: 'Lalu Car Rentals',
    phone: '+91 98765 43210',
    email: 'lalu@lalucarrentals.com',
    city: 'Patna, Bihar',
    gstin: '10AABCA1234Z1Z5',
    initials: 'LP',
    memberSince: '2022'
  },

  cars: [
    {
      id: 'c1',
      plate: 'BR-01-AB-1234',
      make: 'Toyota',
      model: 'Innova Crysta',
      year: 2022,
      color: 'White',
      type: 'SUV',
      emoji: '🚙',
      status: 'active',
      driverId: 'd1',
      fuelType: 'Diesel',
      kmReading: 54320,
      insurance: { number: 'INS20240123', expiry: '2025-03-15' },
      rc: { number: 'RC2022BR01', expiry: '2037-06-30' },
      permit: { number: 'PER2023BR', expiry: '2025-01-10' },
      pollution: { expiry: '2025-06-20' },
      lastService: '2024-09-10',
      nextService: 60000,
      totalEarnings: 142500,
      totalExpenses: 58200,
    },
    {
      id: 'c2',
      plate: 'BR-02-CD-5678',
      make: 'Maruti',
      model: 'Dzire',
      year: 2021,
      color: 'Silver',
      type: 'Sedan',
      emoji: '🚗',
      status: 'active',
      driverId: 'd2',
      fuelType: 'Petrol',
      kmReading: 78540,
      insurance: { number: 'INS20240456', expiry: '2025-08-22' },
      rc: { number: 'RC2021BR02', expiry: '2036-04-15' },
      permit: { number: 'PER2023BR2', expiry: '2025-07-30' },
      pollution: { expiry: '2025-04-10' },
      lastService: '2024-10-01',
      nextService: 80000,
      totalEarnings: 98700,
      totalExpenses: 41300,
    },
    {
      id: 'c3',
      plate: 'BR-03-EF-9012',
      make: 'Tata',
      model: 'Nexon',
      year: 2023,
      color: 'Black',
      type: 'SUV',
      emoji: '🚘',
      status: 'maintenance',
      driverId: null,
      fuelType: 'Diesel',
      kmReading: 23100,
      insurance: { number: 'INS20240789', expiry: '2026-02-18' },
      rc: { number: 'RC2023BR03', expiry: '2038-11-20' },
      permit: { number: 'PER2024BR3', expiry: '2026-08-15' },
      pollution: { expiry: '2025-12-05' },
      lastService: '2024-08-20',
      nextService: 30000,
      totalEarnings: 67800,
      totalExpenses: 29400,
    },
    {
      id: 'c4',
      plate: 'BR-04-GH-3456',
      make: 'Mahindra',
      model: 'Scorpio-N',
      year: 2022,
      color: 'Dark Grey',
      type: 'SUV',
      emoji: '🚐',
      status: 'active',
      driverId: 'd3',
      fuelType: 'Diesel',
      kmReading: 41850,
      insurance: { number: 'INS20241012', expiry: '2025-05-30' },
      rc: { number: 'RC2022BR04', expiry: '2037-09-10' },
      permit: { number: 'PER2023BR4', expiry: '2025-09-22' },
      pollution: { expiry: '2025-03-28' },
      lastService: '2024-09-25',
      nextService: 50000,
      totalEarnings: 112300,
      totalExpenses: 52100,
    }
  ],

  drivers: [
    {
      id: 'd1',
      name: 'Ramesh Kumar',
      phone: '+91 91234 56789',
      license: 'BR1420200012345',
      licenseExpiry: '2028-07-15',
      address: 'Gandhi Nagar, Patna',
      joinDate: '2022-03-15',
      status: 'active',
      carId: 'c1',
      salary: 18000,
      commissionPct: 10,
      advance: 2000,
      initials: 'RK',
      rating: 4.5,
      totalTrips: 342,
      totalEarned: 142500,
    },
    {
      id: 'd2',
      name: 'Suresh Yadav',
      phone: '+91 98765 12345',
      license: 'BR1420210054321',
      licenseExpiry: '2027-03-20',
      address: 'Boring Road, Patna',
      joinDate: '2023-01-10',
      status: 'active',
      carId: 'c2',
      salary: 15000,
      commissionPct: 8,
      advance: 0,
      initials: 'SY',
      rating: 4.2,
      totalTrips: 218,
      totalEarned: 98700,
    },
    {
      id: 'd3',
      name: 'Mohan Paswan',
      phone: '+91 87654 98765',
      license: 'BR1420190098765',
      licenseExpiry: '2026-11-10',
      address: 'Kankarbagh, Patna',
      joinDate: '2021-08-05',
      status: 'active',
      carId: 'c4',
      salary: 20000,
      commissionPct: 12,
      advance: 5000,
      initials: 'MP',
      rating: 4.8,
      totalTrips: 489,
      totalEarned: 112300,
    },
    {
      id: 'd4',
      name: 'Vijay Singh',
      phone: '+91 76543 21098',
      license: 'BR1420220076543',
      licenseExpiry: '2029-05-25',
      address: 'Raja Bazar, Patna',
      joinDate: '2024-02-20',
      status: 'inactive',
      carId: null,
      salary: 14000,
      commissionPct: 8,
      advance: 0,
      initials: 'VS',
      rating: 3.9,
      totalTrips: 87,
      totalEarned: 32400,
    }
  ],

  trips: [
    { id: 't1', carId: 'c1', driverId: 'd1', from: 'Patna', to: 'Gaya', distance: 104, fare: 3200, date: '2024-10-28', time: '09:30', status: 'completed', notes: '' },
    { id: 't2', carId: 'c2', driverId: 'd2', from: 'Patna', to: 'Muzaffarpur', distance: 75, fare: 2400, date: '2024-10-28', time: '11:00', status: 'completed', notes: '' },
    { id: 't3', carId: 'c4', driverId: 'd3', from: 'Patna', to: 'Varanasi', distance: 250, fare: 7500, date: '2024-10-27', time: '06:00', status: 'completed', notes: 'Wedding trip' },
    { id: 't4', carId: 'c1', driverId: 'd1', from: 'Patna', to: 'Darbhanga', distance: 135, fare: 4200, date: '2024-10-27', time: '14:00', status: 'completed', notes: '' },
    { id: 't5', carId: 'c2', driverId: 'd2', from: 'Patna', to: 'Hajipur', distance: 18, fare: 800, date: '2024-10-26', time: '10:30', status: 'completed', notes: '' },
    { id: 't6', carId: 'c4', driverId: 'd3', from: 'Patna', to: 'Ranchi', distance: 330, fare: 9800, date: '2024-10-25', time: '05:00', status: 'completed', notes: 'Corporate booking' },
    { id: 't7', carId: 'c1', driverId: 'd1', from: 'Patna Airport', to: 'Patna City', distance: 8, fare: 450, date: '2024-10-25', time: '19:00', status: 'completed', notes: '' },
    { id: 't8', carId: 'c2', driverId: 'd2', from: 'Patna', to: 'Ara', distance: 60, fare: 1800, date: '2024-10-24', time: '12:00', status: 'completed', notes: '' },
  ],

  expenses: [
    { id: 'e1', carId: 'c1', driverId: 'd1', category: 'Fuel', amount: 3500, date: '2024-10-28', description: 'Full tank diesel', status: 'approved', hasImage: true, imageUrl: null, submittedBy: 'driver' },
    { id: 'e2', carId: 'c2', driverId: 'd2', category: 'Maintenance', amount: 4200, date: '2024-10-26', description: 'Engine oil + filter change', status: 'pending', hasImage: true, imageUrl: null, submittedBy: 'driver' },
    { id: 'e3', carId: 'c4', driverId: 'd3', category: 'Fuel', amount: 6000, date: '2024-10-25', description: 'Diesel for Ranchi trip', status: 'approved', hasImage: false, imageUrl: null, submittedBy: 'driver' },
    { id: 'e4', carId: 'c1', driverId: null, category: 'Insurance', amount: 24500, date: '2024-09-15', description: 'Annual insurance premium', status: 'approved', hasImage: true, imageUrl: null, submittedBy: 'owner' },
    { id: 'e5', carId: 'c3', driverId: null, category: 'Maintenance', amount: 12000, date: '2024-10-20', description: 'Brake pad replacement + tyre rotation', status: 'approved', hasImage: true, imageUrl: null, submittedBy: 'owner' },
    { id: 'e6', carId: 'c2', driverId: 'd2', category: 'Toll', amount: 380, date: '2024-10-28', description: 'Toll charges Patna-Muzaffarpur', status: 'pending', hasImage: false, imageUrl: null, submittedBy: 'driver' },
    { id: 'e7', carId: 'c4', driverId: 'd3', category: 'Washing', amount: 300, date: '2024-10-27', description: 'Car wash after Varanasi trip', status: 'approved', hasImage: false, imageUrl: null, submittedBy: 'driver' },
    { id: 'e8', carId: 'c1', driverId: null, category: 'Permit', amount: 8000, date: '2024-08-01', description: 'Annual permit renewal', status: 'approved', hasImage: true, imageUrl: null, submittedBy: 'owner' },
  ],

  maintenance: [
    { id: 'm1', carId: 'c1', type: 'Engine Oil Change', lastKm: 50000, nextKm: 55000, lastDate: '2024-09-10', status: 'ok' },
    { id: 'm2', carId: 'c2', type: 'Tyre Rotation', lastKm: 75000, nextKm: 80000, lastDate: '2024-10-01', status: 'soon' },
    { id: 'm3', carId: 'c3', type: 'Brake Service', lastKm: 20000, nextKm: 25000, lastDate: '2024-08-20', status: 'overdue' },
    { id: 'm4', carId: 'c4', type: 'Air Filter Change', lastKm: 40000, nextKm: 45000, lastDate: '2024-09-25', status: 'ok' },
    { id: 'm5', carId: 'c1', type: 'AC Service', lastKm: 52000, nextKm: 62000, lastDate: '2024-07-15', status: 'ok' },
    { id: 'm6', carId: 'c2', type: 'Battery Check', lastKm: 78000, nextKm: 88000, lastDate: '2024-09-05', status: 'soon' },
  ],

  notifications: [
    { id: 'n1', title: 'Expense Approval Needed', text: 'Suresh Yadav submitted ₹4,200 for engine oil change (Dzire).', time: '2 hours ago', read: false, type: 'expense', refId: 'e2' },
    { id: 'n2', title: 'Toll Expense Pending', text: 'Suresh Yadav submitted ₹380 toll charge for Patna-Muzaffarpur route.', time: '4 hours ago', read: false, type: 'expense', refId: 'e6' },
    { id: 'n3', title: 'Permit Expiring Soon', text: 'Innova Crysta (BR-01-AB-1234) permit expires on 10 Jan 2025.', time: '1 day ago', read: false, type: 'alert', refId: 'c1' },
    { id: 'n4', title: 'Maintenance Overdue', text: 'Nexon (BR-03-EF-9012) brake service is overdue. Last done at 20,000 km.', time: '2 days ago', read: true, type: 'maintenance', refId: 'c3' },
    { id: 'n5', title: 'Trip Completed', text: 'Mohan Paswan completed Patna → Ranchi trip. ₹9,800 collected.', time: '3 days ago', read: true, type: 'trip', refId: 't6' },
  ],

  // Monthly earnings data for chart (last 6 months)
  monthlyData: [
    { month: 'May', earnings: 168000, expenses: 62000 },
    { month: 'Jun', earnings: 195000, expenses: 71000 },
    { month: 'Jul', earnings: 182000, expenses: 68000 },
    { month: 'Aug', earnings: 210000, expenses: 79000 },
    { month: 'Sep', earnings: 225000, expenses: 85000 },
    { month: 'Oct', earnings: 198500, expenses: 72400 },
  ]
};

// Helper getters
function getCarById(id) { return DB.cars.find(c => c.id === id); }
function getDriverById(id) { return DB.drivers.find(d => d.id === id); }
function getDriverForCar(carId) { return DB.drivers.find(d => d.carId === carId); }
function getCarForDriver(driverId) { return DB.cars.find(c => c.driverId === driverId); }
function getTripsByCarId(carId) { return DB.trips.filter(t => t.carId === carId); }
function getTripsByDriverId(driverId) { return DB.trips.filter(t => t.driverId === driverId); }
function getExpensesByCarId(carId) { return DB.expenses.filter(e => e.carId === carId); }
function getPendingExpenses() { return DB.expenses.filter(e => e.status === 'pending'); }
function getMaintenanceForCar(carId) { return DB.maintenance.filter(m => m.carId === carId); }
function getUnreadCount() { return DB.notifications.filter(n => !n.read).length; }

function totalEarningsAll() { return DB.cars.reduce((sum, c) => sum + c.totalEarnings, 0); }
function totalExpensesAll() { return DB.cars.reduce((sum, c) => sum + c.totalExpenses, 0); }
function netProfitAll() { return totalEarningsAll() - totalExpensesAll(); }
function totalTripsAll() { return DB.trips.length; }

function generateId(prefix) {
  return prefix + Date.now().toString(36) + Math.random().toString(36).substr(2, 4);
}
