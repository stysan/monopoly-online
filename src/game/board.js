// Classic Monopoly board - 40 squares
const BOARD = [
  // Square 0: GO
  { id: 0, name: 'GO', type: 'go' },

  // Brown
  { id: 1, name: 'Mediterranean Ave', type: 'property', color: 'brown', price: 60, rent: [2, 10, 30, 90, 160, 250], houseCost: 50, hotelCost: 50, mortgage: 30 },
  { id: 2, name: 'Community Chest', type: 'community_chest' },
  { id: 3, name: 'Baltic Ave', type: 'property', color: 'brown', price: 60, rent: [4, 20, 60, 180, 320, 450], houseCost: 50, hotelCost: 50, mortgage: 30 },
  { id: 4, name: 'Income Tax', type: 'tax', amount: 200 },
  // Railroad
  { id: 5, name: 'Reading Railroad', type: 'railroad', price: 200, mortgage: 100 },

  // Light Blue
  { id: 6, name: 'Oriental Ave', type: 'property', color: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, hotelCost: 50, mortgage: 50 },
  { id: 7, name: 'Chance', type: 'chance' },
  { id: 8, name: 'Vermont Ave', type: 'property', color: 'lightblue', price: 100, rent: [6, 30, 90, 270, 400, 550], houseCost: 50, hotelCost: 50, mortgage: 50 },
  { id: 9, name: 'Connecticut Ave', type: 'property', color: 'lightblue', price: 120, rent: [8, 40, 100, 300, 450, 600], houseCost: 50, hotelCost: 50, mortgage: 60 },
  { id: 10, name: 'Jail / Just Visiting', type: 'jail' },

  // Pink
  { id: 11, name: 'St. Charles Place', type: 'property', color: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, hotelCost: 100, mortgage: 70 },
  { id: 12, name: 'Electric Company', type: 'utility', price: 150, mortgage: 75 },
  { id: 13, name: 'States Ave', type: 'property', color: 'pink', price: 140, rent: [10, 50, 150, 450, 625, 750], houseCost: 100, hotelCost: 100, mortgage: 70 },
  { id: 14, name: 'Virginia Ave', type: 'property', color: 'pink', price: 160, rent: [12, 60, 180, 500, 700, 900], houseCost: 100, hotelCost: 100, mortgage: 80 },
  // Railroad
  { id: 15, name: 'Pennsylvania Railroad', type: 'railroad', price: 200, mortgage: 100 },

  // Orange
  { id: 16, name: 'St. James Place', type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, hotelCost: 100, mortgage: 90 },
  { id: 17, name: 'Community Chest', type: 'community_chest' },
  { id: 18, name: 'Tennessee Ave', type: 'property', color: 'orange', price: 180, rent: [14, 70, 200, 550, 750, 950], houseCost: 100, hotelCost: 100, mortgage: 90 },
  { id: 19, name: 'New York Ave', type: 'property', color: 'orange', price: 200, rent: [16, 80, 220, 600, 800, 1000], houseCost: 100, hotelCost: 100, mortgage: 100 },
  { id: 20, name: 'Free Parking', type: 'free_parking' },

  // Red
  { id: 21, name: 'Kentucky Ave', type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, hotelCost: 150, mortgage: 110 },
  { id: 22, name: 'Chance', type: 'chance' },
  { id: 23, name: 'Indiana Ave', type: 'property', color: 'red', price: 220, rent: [18, 90, 250, 700, 875, 1050], houseCost: 150, hotelCost: 150, mortgage: 110 },
  { id: 24, name: 'Illinois Ave', type: 'property', color: 'red', price: 240, rent: [20, 100, 300, 750, 925, 1100], houseCost: 150, hotelCost: 150, mortgage: 120 },
  // Railroad
  { id: 25, name: 'B&O Railroad', type: 'railroad', price: 200, mortgage: 100 },

  // Yellow
  { id: 26, name: 'Atlantic Ave', type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, hotelCost: 150, mortgage: 130 },
  { id: 27, name: 'Ventnor Ave', type: 'property', color: 'yellow', price: 260, rent: [22, 110, 330, 800, 975, 1150], houseCost: 150, hotelCost: 150, mortgage: 130 },
  { id: 28, name: 'Water Works', type: 'utility', price: 150, mortgage: 75 },
  { id: 29, name: 'Marvin Gardens', type: 'property', color: 'yellow', price: 280, rent: [24, 120, 360, 850, 1025, 1200], houseCost: 150, hotelCost: 150, mortgage: 140 },
  { id: 30, name: 'Go To Jail', type: 'go_to_jail' },

  // Green
  { id: 31, name: 'Pacific Ave', type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, hotelCost: 200, mortgage: 150 },
  { id: 32, name: 'North Carolina Ave', type: 'property', color: 'green', price: 300, rent: [26, 130, 390, 900, 1100, 1275], houseCost: 200, hotelCost: 200, mortgage: 150 },
  { id: 33, name: 'Community Chest', type: 'community_chest' },
  { id: 34, name: 'Pennsylvania Ave', type: 'property', color: 'green', price: 320, rent: [28, 150, 450, 1000, 1200, 1400], houseCost: 200, hotelCost: 200, mortgage: 160 },
  // Railroad
  { id: 35, name: 'Short Line Railroad', type: 'railroad', price: 200, mortgage: 100 },
  { id: 36, name: 'Chance', type: 'chance' },

  // Dark Blue
  { id: 37, name: 'Park Place', type: 'property', color: 'darkblue', price: 350, rent: [35, 175, 500, 1100, 1300, 1500], houseCost: 200, hotelCost: 200, mortgage: 175 },
  { id: 38, name: 'Luxury Tax', type: 'tax', amount: 100 },
  { id: 39, name: 'Boardwalk', type: 'property', color: 'darkblue', price: 400, rent: [50, 200, 600, 1400, 1700, 2000], houseCost: 200, hotelCost: 200, mortgage: 200 }
];

const COLOR_GROUPS = {
  brown: [1, 3],
  lightblue: [6, 8, 9],
  pink: [11, 13, 14],
  orange: [16, 18, 19],
  red: [21, 23, 24],
  yellow: [26, 27, 29],
  green: [31, 32, 34],
  darkblue: [37, 39]
};

const RAILROADS = [5, 15, 25, 35];
const UTILITIES = [12, 28];

const CHANCE_CARDS = [
  { id: 'advance_go', text: 'Advance to GO. Collect $200.', action: 'advance', target: 0 },
  { id: 'advance_illinois', text: 'Advance to Illinois Ave.', action: 'advance', target: 24 },
  { id: 'advance_stcharles', text: 'Advance to St. Charles Place. Pay rent if occupied.', action: 'advance', target: 11 },
  { id: 'advance_railroad1', text: 'Advance to nearest Railroad.', action: 'nearest_railroad' },
  { id: 'advance_railroad2', text: 'Advance to nearest Railroad.', action: 'nearest_railroad' },
  { id: 'advance_utility', text: 'Advance to nearest Utility.', action: 'nearest_utility' },
  { id: 'bank_dividend', text: 'Bank pays you dividend of $50.', action: 'gain', amount: 50 },
  { id: 'get_out_jail', text: 'Get Out of Jail Free.', action: 'get_out_jail_free' },
  { id: 'go_back_3', text: 'Go Back 3 Spaces.', action: 'go_back', amount: 3 },
  { id: 'go_to_jail', text: 'Go to Jail. Go directly to Jail.', action: 'go_to_jail' },
  { id: 'general_repairs', text: 'Make general repairs on all your property. $25/house, $100/hotel.', action: 'repairs', house: 25, hotel: 100 },
  { id: 'speeding_fine', text: 'Speeding fine $15.', action: 'pay', amount: 15 },
  { id: 'advance_boardwalk', text: 'Take a trip to Boardwalk.', action: 'advance', target: 39 },
  { id: 'chairman', text: 'You have been elected Chairman of the Board. Pay each player $50.', action: 'pay_all', amount: 50 },
  { id: 'loan_matures', text: 'Your building loan matures. Collect $150.', action: 'gain', amount: 150 },
  { id: 'street_repairs', text: 'You are assessed for street repairs. $40/house, $115/hotel.', action: 'repairs', house: 40, hotel: 115 }
];

const COMMUNITY_CHEST_CARDS = [
  { id: 'advance_go', text: 'Advance to GO. Collect $200.', action: 'advance', target: 0 },
  { id: 'bank_error', text: 'Bank error in your favor. Collect $200.', action: 'gain', amount: 200 },
  { id: 'doctor_fee', text: "Doctor's fee. Pay $50.", action: 'pay', amount: 50 },
  { id: 'stock_sale', text: 'From sale of stock you get $50.', action: 'gain', amount: 50 },
  { id: 'get_out_jail', text: 'Get Out of Jail Free.', action: 'get_out_jail_free' },
  { id: 'go_to_jail', text: 'Go to Jail. Go directly to Jail.', action: 'go_to_jail' },
  { id: 'grand_opera', text: 'Grand Opera Night. Collect $50 from every player.', action: 'collect_all', amount: 50 },
  { id: 'holiday_fund', text: 'Holiday fund matures. Receive $100.', action: 'gain', amount: 100 },
  { id: 'income_tax_refund', text: 'Income tax refund. Collect $20.', action: 'gain', amount: 20 },
  { id: 'birthday', text: "It is your birthday. Collect $10 from every player.", action: 'collect_all', amount: 10 },
  { id: 'life_insurance', text: 'Life insurance matures. Collect $100.', action: 'gain', amount: 100 },
  { id: 'hospital_fees', text: 'Pay hospital fees of $100.', action: 'pay', amount: 100 },
  { id: 'school_fees', text: 'Pay school fees of $150.', action: 'pay', amount: 150 },
  { id: 'consultancy_fee', text: 'Receive $25 consultancy fee.', action: 'gain', amount: 25 },
  { id: 'street_repairs', text: 'You are assessed for street repairs. $40/house, $115/hotel.', action: 'repairs', house: 40, hotel: 115 },
  { id: 'beauty_contest', text: 'You have won second prize in a beauty contest. Collect $10.', action: 'gain', amount: 10 },
  { id: 'inheritance', text: 'You inherit $100.', action: 'gain', amount: 100 }
];

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createDecks() {
  return {
    chance: shuffle(CHANCE_CARDS),
    community_chest: shuffle(COMMUNITY_CHEST_CARDS)
  };
}

module.exports = { BOARD, COLOR_GROUPS, RAILROADS, UTILITIES, createDecks };
