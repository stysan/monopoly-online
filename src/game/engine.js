const { v4: uuidv4 } = require('uuid');
const { BOARD, COLOR_GROUPS, RAILROADS, UTILITIES, createDecks } = require('./board');

const STARTING_MONEY = 1500;
const GO_SALARY = 200;
const JAIL_POSITION = 10;
const GO_TO_JAIL_POSITION = 30;
const MAX_JAIL_TURNS = 3;
const HOUSE_LIMIT = 32;
const HOTEL_LIMIT = 12;

const AVATARS = ['top-hat', 'car', 'iron', 'ship', 'dog', 'wheelbarrow', 'thimble', 'boot'];

class GameEngine {
  constructor(gameId, settings = {}) {
    this.id = gameId;
    this.settings = {
      maxPlayers: settings.maxPlayers || 4,
      startingMoney: settings.startingMoney || STARTING_MONEY,
      speedDie: settings.speedDie || false,
      auctionEnabled: settings.auctionEnabled !== false,
      freeParkingJackpot: settings.freeParkingJackpot || false,
      maxTurns: settings.maxTurns || 0,
      ...settings
    };

    this.state = 'lobby'; // lobby | playing | ended
    this.players = [];
    this.properties = {}; // positionId -> { ownerId, houses, mortgaged }
    this.currentPlayerIndex = 0;
    this.turnPhase = 'roll'; // roll | action | buy | auction | jail_decision | end_turn
    this.doublesCount = 0;
    this.lastRoll = null;
    this.decks = createDecks();
    this.log = [];
    this.freeParkingPot = 0;
    this.housesAvailable = HOUSE_LIMIT;
    this.hotelsAvailable = HOTEL_LIMIT;
    this.startedAt = null;
    this.endedAt = null;
    this.pendingCard = null;
    this.auction = null;
    this.tradeOffer = null;
    this.winner = null;
  }

  // ─── Player Management ──────────────────────────────────────────────────────

  addPlayer(userId, username, avatar) {
    if (this.state !== 'lobby') return { error: 'Game already started' };
    if (this.players.length >= this.settings.maxPlayers) return { error: 'Game is full' };
    if (this.players.find(p => p.userId === userId)) return { error: 'Already in game' };

    const usedAvatars = this.players.map(p => p.avatar);
    const finalAvatar = (!avatar || usedAvatars.includes(avatar))
      ? AVATARS.find(a => !usedAvatars.includes(a)) || 'top-hat'
      : avatar;

    const player = {
      userId,
      username,
      avatar: finalAvatar,
      money: this.settings.startingMoney,
      position: 0,
      inJail: false,
      jailTurns: 0,
      getOutOfJailCards: 0,
      isBankrupt: false,
      isConnected: true,
      totalMoneyEarned: this.settings.startingMoney,
      propertiesBought: 0,
      rentCollected: 0,
      rentPaid: 0,
      monopoliesFormed: 0,
      hotelsBuilt: 0,
      doublesRolled: 0
    };

    this.players.push(player);
    return { success: true, player };
  }

  removePlayer(userId) {
    const idx = this.players.findIndex(p => p.userId === userId);
    if (idx === -1) return;
    if (this.state === 'lobby') {
      this.players.splice(idx, 1);
    } else {
      this.players[idx].isConnected = false;
    }
  }

  getPlayer(userId) {
    return this.players.find(p => p.userId === userId);
  }

  get currentPlayer() {
    return this.players[this.currentPlayerIndex];
  }

  getActivePlayers() {
    return this.players.filter(p => !p.isBankrupt);
  }

  // ─── Game Start ─────────────────────────────────────────────────────────────

  start() {
    if (this.state !== 'lobby') return { error: 'Already started' };
    if (this.players.length < 2) return { error: 'Need at least 2 players' };

    // Shuffle player order
    for (let i = this.players.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.players[i], this.players[j]] = [this.players[j], this.players[i]];
    }

    this.state = 'playing';
    this.startedAt = Date.now();
    this.addLog(`Game started! ${this.players.map(p => p.username).join(', ')} are playing.`);
    return { success: true };
  }

  // ─── Dice & Movement ────────────────────────────────────────────────────────

  rollDice() {
    const player = this.currentPlayer;
    if (!player || this.turnPhase !== 'roll') return { error: 'Cannot roll now' };
    if (player.isBankrupt) { this.nextTurn(); return { skipped: true }; }

    const d1 = Math.ceil(Math.random() * 6);
    const d2 = Math.ceil(Math.random() * 6);
    const isDoubles = d1 === d2;
    this.lastRoll = { d1, d2, total: d1 + d2, isDoubles };

    if (player.inJail) {
      return this._handleJailRoll(d1, d2, isDoubles);
    }

    if (isDoubles) {
      this.doublesCount++;
      if (this.doublesCount >= 3) {
        this.addLog(`${player.username} rolled doubles 3 times — Go to Jail!`);
        this._sendToJail(player);
        this.doublesCount = 0;
        this.turnPhase = 'end_turn';
        return { roll: this.lastRoll, event: 'go_to_jail' };
      }
    } else {
      this.doublesCount = 0;
    }

    return this._movePlayer(player, d1 + d2);
  }

  _handleJailRoll(d1, d2, isDoubles) {
    const player = this.currentPlayer;
    if (isDoubles) {
      player.inJail = false;
      player.jailTurns = 0;
      this.addLog(`${player.username} rolled doubles and got out of Jail!`);
      return this._movePlayer(player, d1 + d2);
    }

    player.jailTurns++;
    if (player.jailTurns >= MAX_JAIL_TURNS) {
      // Must pay fine
      player.inJail = false;
      player.jailTurns = 0;
      this._pay(player, null, 50, 'Jail fine');
      this.addLog(`${player.username} paid $50 fine to leave Jail.`);
      return this._movePlayer(player, d1 + d2);
    }

    this.addLog(`${player.username} is still in Jail (turn ${player.jailTurns}/${MAX_JAIL_TURNS}).`);
    this.turnPhase = 'end_turn';
    return { roll: this.lastRoll, event: 'jail_stay' };
  }

  _movePlayer(player, steps) {
    const oldPos = player.position;
    const newPos = (oldPos + steps) % 40;

    // Passed GO
    if (newPos < oldPos || (oldPos === 0 && steps > 0)) {
      if (newPos !== 0) { // not landing on GO itself
        this._gain(player, GO_SALARY, 'Passed GO');
        this.addLog(`${player.username} passed GO and collected $${GO_SALARY}.`);
      }
    }

    player.position = newPos;
    this.addLog(`${player.username} rolled ${this.lastRoll.d1}+${this.lastRoll.d2}=${this.lastRoll.total} and moved to ${BOARD[newPos].name}.`);

    const result = this._landOnSquare(player, newPos);
    return { roll: this.lastRoll, moved: true, newPosition: newPos, ...result };
  }

  _landOnSquare(player, pos) {
    const square = BOARD[pos];
    let event = { type: square.type };

    switch (square.type) {
      case 'go':
        this._gain(player, GO_SALARY, 'Landed on GO');
        this.addLog(`${player.username} landed on GO and collected $${GO_SALARY}.`);
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;

      case 'property':
      case 'railroad':
      case 'utility':
        event = this._handleProperty(player, pos);
        break;

      case 'tax':
        this._pay(player, null, square.amount, square.name);
        if (this.settings.freeParkingJackpot) this.freeParkingPot += square.amount;
        this.addLog(`${player.username} paid $${square.amount} in taxes.`);
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;

      case 'chance':
        event = this._drawCard('chance', player);
        break;

      case 'community_chest':
        event = this._drawCard('community_chest', player);
        break;

      case 'go_to_jail':
        this._sendToJail(player);
        this.doublesCount = 0;
        this.turnPhase = 'end_turn';
        event.jailed = true;
        break;

      case 'free_parking':
        if (this.settings.freeParkingJackpot && this.freeParkingPot > 0) {
          this._gain(player, this.freeParkingPot, 'Free Parking jackpot');
          this.addLog(`${player.username} collected $${this.freeParkingPot} from Free Parking!`);
          this.freeParkingPot = 0;
        } else {
          this.addLog(`${player.username} is resting at Free Parking.`);
        }
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;

      case 'jail':
        this.addLog(`${player.username} is just visiting Jail.`);
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;

      default:
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
    }

    return event;
  }

  _handleProperty(player, pos) {
    const square = BOARD[pos];
    const prop = this.properties[pos];

    if (!prop) {
      // Unowned — offer to buy or auction
      this.turnPhase = 'buy';
      return { type: 'buy_offer', square, canAfford: player.money >= square.price };
    }

    if (prop.mortgaged) {
      this.addLog(`${player.username} landed on ${square.name} (mortgaged).`);
      this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
      return { type: 'mortgaged' };
    }

    const owner = this.players.find(p => p.userId === prop.ownerId);
    if (!owner || owner.userId === player.userId) {
      this.addLog(`${player.username} landed on their own property.`);
      this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
      return { type: 'own_property' };
    }

    // Pay rent
    const rent = this._calculateRent(pos, prop, owner);
    const paid = this._pay(player, owner, rent, `Rent: ${square.name}`);
    owner.rentCollected += paid;
    player.rentPaid += paid;
    this.addLog(`${player.username} paid $${paid} rent to ${owner.username} for ${square.name}.`);

    this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';

    if (player.money < 0) {
      return { type: 'rent_paid', rent: paid, ...this._handleBankruptcy(player, owner) };
    }
    return { type: 'rent_paid', rent: paid };
  }

  _calculateRent(pos, prop, owner) {
    const square = BOARD[pos];

    if (square.type === 'railroad') {
      const ownedRR = RAILROADS.filter(r => this.properties[r]?.ownerId === owner.userId).length;
      return 25 * Math.pow(2, ownedRR - 1);
    }

    if (square.type === 'utility') {
      const ownedUtil = UTILITIES.filter(u => this.properties[u]?.ownerId === owner.userId).length;
      const multiplier = ownedUtil === 2 ? 10 : 4;
      return (this.lastRoll?.total || 7) * multiplier;
    }

    // Standard property
    const houses = prop.houses || 0;
    const hasHotel = prop.hotel || false;
    const rentIdx = hasHotel ? 5 : houses; // 0=base,1-4=houses,5=hotel

    // Double rent if color monopoly and no houses
    if (houses === 0 && !hasHotel) {
      const group = COLOR_GROUPS[square.color];
      const monopoly = group.every(id => this.properties[id]?.ownerId === owner.userId);
      return monopoly ? square.rent[0] * 2 : square.rent[0];
    }

    return square.rent[rentIdx] || square.rent[0];
  }

  // ─── Cards ──────────────────────────────────────────────────────────────────

  _drawCard(deck, player) {
    if (this.decks[deck].length === 0) this.decks[deck] = createDecks()[deck];
    const card = this.decks[deck].shift();
    this.decks[deck].push(card); // put at bottom
    this.addLog(`${player.username} drew: "${card.text}"`);

    this.pendingCard = card;
    return this._applyCard(card, player);
  }

  _applyCard(card, player) {
    let result = { type: 'card', card };

    switch (card.action) {
      case 'advance': {
        const oldPos = player.position;
        if (card.target < oldPos) {
          this._gain(player, GO_SALARY, 'Passed GO');
          this.addLog(`${player.username} passed GO and collected $${GO_SALARY}.`);
        }
        player.position = card.target;
        const landing = this._landOnSquare(player, card.target);
        return { ...result, ...landing, moved: true };
      }

      case 'nearest_railroad': {
        const next = this._nearestOf(player.position, RAILROADS);
        const oldPos = player.position;
        if (next < oldPos) {
          this._gain(player, GO_SALARY, 'Passed GO');
        }
        player.position = next;
        const landing = this._landOnSquare(player, next);
        // Double rent on this roll
        return { ...result, ...landing, doubleRent: true };
      }

      case 'nearest_utility': {
        const next = this._nearestOf(player.position, UTILITIES);
        const oldPos = player.position;
        if (next < oldPos) {
          this._gain(player, GO_SALARY, 'Passed GO');
        }
        player.position = next;
        const landing = this._landOnSquare(player, next);
        return { ...result, ...landing };
      }

      case 'gain':
        this._gain(player, card.amount, card.text);
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;

      case 'pay':
        this._pay(player, null, card.amount, card.text);
        if (this.settings.freeParkingJackpot) this.freeParkingPot += card.amount;
        if (player.money < 0) return { ...result, ...this._handleBankruptcy(player, null) };
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;

      case 'pay_all': {
        const others = this.getActivePlayers().filter(p => p.userId !== player.userId);
        for (const other of others) {
          const paid = this._pay(player, other, card.amount, card.text);
          other.rentCollected += paid;
        }
        if (player.money < 0) return { ...result, ...this._handleBankruptcy(player, null) };
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;
      }

      case 'collect_all': {
        const others = this.getActivePlayers().filter(p => p.userId !== player.userId);
        for (const other of others) {
          const amt = Math.min(card.amount, other.money);
          other.money -= amt;
          player.money += amt;
          player.rentCollected += amt;
        }
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;
      }

      case 'get_out_jail_free':
        player.getOutOfJailCards++;
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;

      case 'go_to_jail':
        this._sendToJail(player);
        this.doublesCount = 0;
        this.turnPhase = 'end_turn';
        result.jailed = true;
        break;

      case 'go_back': {
        const newPos = (player.position - card.amount + 40) % 40;
        player.position = newPos;
        const landing = this._landOnSquare(player, newPos);
        return { ...result, ...landing };
      }

      case 'repairs': {
        let total = 0;
        for (const [pos, prop] of Object.entries(this.properties)) {
          if (prop.ownerId === player.userId) {
            if (prop.hotel) total += card.hotel;
            else total += (prop.houses || 0) * card.house;
          }
        }
        if (total > 0) {
          this._pay(player, null, total, 'Repairs');
          if (this.settings.freeParkingJackpot) this.freeParkingPot += total;
        }
        if (player.money < 0) return { ...result, ...this._handleBankruptcy(player, null) };
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
        break;
      }

      default:
        this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
    }

    return result;
  }

  _nearestOf(pos, positions) {
    let nearest = positions[0];
    let minDist = 40;
    for (const p of positions) {
      const dist = (p - pos + 40) % 40;
      if (dist > 0 && dist < minDist) {
        minDist = dist;
        nearest = p;
      }
    }
    return nearest;
  }

  // ─── Buying & Building ──────────────────────────────────────────────────────

  buyProperty(userId) {
    const player = this.getPlayer(userId);
    if (!player || player.userId !== this.currentPlayer.userId) return { error: 'Not your turn' };
    if (this.turnPhase !== 'buy') return { error: 'Cannot buy now' };

    const pos = player.position;
    const square = BOARD[pos];
    if (!square || !square.price) return { error: 'Not a buyable square' };
    if (this.properties[pos]) return { error: 'Already owned' };
    if (player.money < square.price) return { error: 'Not enough money' };

    player.money -= square.price;
    player.totalMoneyEarned += 0; // buying is spending
    player.propertiesBought++;

    this.properties[pos] = { ownerId: userId, houses: 0, hotel: false, mortgaged: false };

    // Check monopoly
    const monopoly = this._checkMonopoly(userId, square.color);
    if (monopoly) player.monopoliesFormed++;

    this.addLog(`${player.username} bought ${square.name} for $${square.price}.`);
    this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
    return { success: true, monopoly };
  }

  declineBuy(userId) {
    const player = this.getPlayer(userId);
    if (!player || player.userId !== this.currentPlayer.userId) return { error: 'Not your turn' };
    if (this.turnPhase !== 'buy') return { error: 'Cannot do this now' };

    if (this.settings.auctionEnabled) {
      return this.startAuction(this.currentPlayer.position);
    }

    this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
    return { success: true };
  }

  startAuction(pos) {
    const square = BOARD[pos];
    this.auction = {
      propertyPos: pos,
      propertyName: square.name,
      currentBid: 0,
      highestBidderId: null,
      bids: {},
      active: true
    };
    this.turnPhase = 'auction';
    this.addLog(`${square.name} goes to auction!`);
    return { success: true, auction: this.auction };
  }

  placeBid(userId, amount) {
    if (!this.auction || !this.auction.active) return { error: 'No auction' };
    const player = this.getPlayer(userId);
    if (!player || player.isBankrupt) return { error: 'Cannot bid' };
    if (amount <= this.auction.currentBid) return { error: 'Bid must be higher than current' };
    if (amount > player.money) return { error: 'Not enough money' };

    this.auction.currentBid = amount;
    this.auction.highestBidderId = userId;
    this.auction.bids[userId] = amount;
    this.addLog(`${player.username} bids $${amount} for ${this.auction.propertyName}.`);
    return { success: true };
  }

  endAuction() {
    if (!this.auction) return { error: 'No auction' };
    const { propertyPos, currentBid, highestBidderId } = this.auction;

    if (highestBidderId && currentBid > 0) {
      const winner = this.getPlayer(highestBidderId);
      winner.money -= currentBid;
      winner.propertiesBought++;
      this.properties[propertyPos] = { ownerId: highestBidderId, houses: 0, hotel: false, mortgaged: false };
      const monopoly = this._checkMonopoly(highestBidderId, BOARD[propertyPos].color);
      if (monopoly) winner.monopoliesFormed++;
      this.addLog(`${winner.username} won auction for ${this.auction.propertyName} at $${currentBid}!`);
    } else {
      this.addLog(`No bids — ${this.auction.propertyName} remains unowned.`);
    }

    this.auction = null;
    this.turnPhase = this.lastRoll?.isDoubles ? 'roll' : 'end_turn';
    return { success: true };
  }

  buildHouse(userId, pos) {
    const player = this.getPlayer(userId);
    if (!player) return { error: 'Player not found' };
    const prop = this.properties[pos];
    if (!prop || prop.ownerId !== userId) return { error: 'Not your property' };
    if (prop.mortgaged) return { error: 'Property is mortgaged' };

    const square = BOARD[pos];
    if (square.type !== 'property') return { error: 'Cannot build here' };
    if (prop.hotel) return { error: 'Already has a hotel' };

    const group = COLOR_GROUPS[square.color];
    if (!group) return { error: 'Invalid color group' };

    // Must own all in group
    const monopoly = group.every(id => this.properties[id]?.ownerId === userId && !this.properties[id]?.mortgaged);
    if (!monopoly) return { error: 'Must own all properties in the group' };

    // Even building rule
    const myHouses = prop.houses;
    const maxOthers = Math.max(...group.filter(id => id !== pos).map(id => this.properties[id]?.houses || 0));
    if (myHouses >= maxOthers + 1 && myHouses < 4) return { error: 'Must build evenly across group' };

    if (prop.houses === 4) {
      // Build hotel
      if (this.hotelsAvailable <= 0) return { error: 'No hotels available' };
      const cost = square.hotelCost;
      if (player.money < cost) return { error: 'Not enough money' };
      player.money -= cost;
      prop.houses = 0;
      prop.hotel = true;
      this.housesAvailable += 4;
      this.hotelsAvailable--;
      player.hotelsBuilt++;
      this.addLog(`${player.username} built a hotel on ${square.name}!`);
    } else {
      if (this.housesAvailable <= 0) return { error: 'No houses available' };
      const cost = square.houseCost;
      if (player.money < cost) return { error: 'Not enough money' };
      player.money -= cost;
      prop.houses++;
      this.housesAvailable--;
      this.addLog(`${player.username} built house #${prop.houses} on ${square.name}.`);
    }

    return { success: true };
  }

  sellHouse(userId, pos) {
    const player = this.getPlayer(userId);
    if (!player) return { error: 'Player not found' };
    const prop = this.properties[pos];
    if (!prop || prop.ownerId !== userId) return { error: 'Not your property' };

    const square = BOARD[pos];
    if (prop.hotel) {
      prop.hotel = false;
      prop.houses = 4;
      this.hotelsAvailable++;
      this.housesAvailable -= 4;
      const refund = Math.floor(square.hotelCost / 2);
      player.money += refund;
      this.addLog(`${player.username} sold hotel on ${square.name} for $${refund}.`);
    } else if (prop.houses > 0) {
      prop.houses--;
      this.housesAvailable++;
      const refund = Math.floor(square.houseCost / 2);
      player.money += refund;
      this.addLog(`${player.username} sold house on ${square.name} for $${refund}.`);
    } else {
      return { error: 'No buildings to sell' };
    }

    return { success: true };
  }

  mortgageProperty(userId, pos) {
    const player = this.getPlayer(userId);
    if (!player) return { error: 'Player not found' };
    const prop = this.properties[pos];
    if (!prop || prop.ownerId !== userId) return { error: 'Not your property' };
    if (prop.mortgaged) return { error: 'Already mortgaged' };
    if (prop.houses > 0 || prop.hotel) return { error: 'Sell buildings first' };

    const square = BOARD[pos];
    player.money += square.mortgage;
    prop.mortgaged = true;
    this.addLog(`${player.username} mortgaged ${square.name} for $${square.mortgage}.`);
    return { success: true };
  }

  unmortgageProperty(userId, pos) {
    const player = this.getPlayer(userId);
    if (!player) return { error: 'Player not found' };
    const prop = this.properties[pos];
    if (!prop || prop.ownerId !== userId) return { error: 'Not your property' };
    if (!prop.mortgaged) return { error: 'Not mortgaged' };

    const square = BOARD[pos];
    const cost = Math.floor(square.mortgage * 1.1);
    if (player.money < cost) return { error: 'Not enough money' };
    player.money -= cost;
    prop.mortgaged = false;
    this.addLog(`${player.username} unmortgaged ${square.name} for $${cost}.`);
    return { success: true };
  }

  // ─── Jail ───────────────────────────────────────────────────────────────────

  payJailFine(userId) {
    const player = this.getPlayer(userId);
    if (!player || !player.inJail) return { error: 'Not in jail' };
    if (player.userId !== this.currentPlayer.userId) return { error: 'Not your turn' };
    if (this.turnPhase !== 'roll') return { error: 'Can only pay before rolling' };
    if (player.money < 50) return { error: 'Not enough money' };

    player.money -= 50;
    player.inJail = false;
    player.jailTurns = 0;
    this.addLog(`${player.username} paid $50 to leave Jail.`);
    return { success: true };
  }

  useJailCard(userId) {
    const player = this.getPlayer(userId);
    if (!player || !player.inJail) return { error: 'Not in jail' };
    if (player.getOutOfJailCards <= 0) return { error: 'No Get Out of Jail Free card' };

    player.getOutOfJailCards--;
    player.inJail = false;
    player.jailTurns = 0;
    this.addLog(`${player.username} used a Get Out of Jail Free card.`);
    return { success: true };
  }

  // ─── Trading ────────────────────────────────────────────────────────────────

  offerTrade(fromUserId, toUserId, offer) {
    // offer: { giveProperties: [], giveMoney: 0, getProperties: [], getMoney: 0 }
    this.tradeOffer = { fromUserId, toUserId, offer, status: 'pending' };
    return { success: true };
  }

  respondTrade(userId, accept) {
    if (!this.tradeOffer || this.tradeOffer.toUserId !== userId) return { error: 'No trade offer' };

    if (!accept) {
      this.tradeOffer = null;
      return { success: true, accepted: false };
    }

    const from = this.getPlayer(this.tradeOffer.fromUserId);
    const to = this.getPlayer(userId);
    const { offer } = this.tradeOffer;

    // Validate
    if (from.money < offer.giveMoney) return { error: 'Offerer has insufficient funds' };
    if (to.money < offer.getMoney) return { error: 'You have insufficient funds' };

    // Execute
    from.money -= offer.giveMoney;
    to.money += offer.giveMoney;
    from.money += offer.getMoney;
    to.money -= offer.getMoney;

    for (const pos of (offer.giveProperties || [])) {
      if (this.properties[pos]?.ownerId === from.userId) {
        this.properties[pos].ownerId = to.userId;
      }
    }
    for (const pos of (offer.getProperties || [])) {
      if (this.properties[pos]?.ownerId === to.userId) {
        this.properties[pos].ownerId = from.userId;
      }
    }

    this.addLog(`Trade completed: ${from.username} and ${to.username} made a deal.`);
    this.tradeOffer = null;
    return { success: true, accepted: true };
  }

  // ─── Turn Management ────────────────────────────────────────────────────────

  endTurn(userId) {
    if (!this.currentPlayer || this.currentPlayer.userId !== userId) return { error: 'Not your turn' };
    if (this.turnPhase !== 'end_turn') return { error: 'Cannot end turn yet' };
    this.nextTurn();
    return { success: true };
  }

  nextTurn() {
    const active = this.getActivePlayers();
    if (active.length <= 1) {
      this._endGame(active[0]);
      return;
    }

    let next = (this.currentPlayerIndex + 1) % this.players.length;
    let attempts = 0;
    while (this.players[next].isBankrupt && attempts < this.players.length) {
      next = (next + 1) % this.players.length;
      attempts++;
    }
    this.currentPlayerIndex = next;
    this.doublesCount = 0;
    this.turnPhase = 'roll';
    this.addLog(`--- ${this.currentPlayer.username}'s turn ---`);
  }

  // ─── Bankruptcy ─────────────────────────────────────────────────────────────

  _handleBankruptcy(player, creditor) {
    if (player.money >= 0) return {};

    // Try to sell/mortgage to cover
    // (simplified — in real game player would negotiate; here auto-bankrupt if can't cover)
    const netWorth = this._calculateNetWorth(player);
    if (netWorth > 0) return { needsMoney: true, shortfall: Math.abs(player.money) };

    // Bankrupt!
    player.isBankrupt = true;
    this.addLog(`${player.username} has gone BANKRUPT!`);

    // Transfer assets to creditor or bank
    const myProps = Object.entries(this.properties)
      .filter(([, p]) => p.ownerId === player.userId)
      .map(([pos]) => parseInt(pos));

    for (const pos of myProps) {
      if (creditor) {
        this.properties[pos].ownerId = creditor.userId;
      } else {
        delete this.properties[pos]; // back to bank
      }
    }

    if (creditor) {
      creditor.money += Math.max(0, player.money);
    }
    player.money = 0;

    const active = this.getActivePlayers();
    if (active.length === 1) {
      this._endGame(active[0]);
    }

    return { bankrupt: true };
  }

  declareBankruptcy(userId) {
    const player = this.getPlayer(userId);
    if (!player) return { error: 'Player not found' };
    return this._handleBankruptcy(player, null);
  }

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  _pay(player, recipient, amount, reason) {
    const actual = Math.min(amount, player.money + 999999); // can go negative
    player.money -= amount;
    if (recipient) {
      recipient.money += amount;
      recipient.totalMoneyEarned += amount;
    }
    return amount;
  }

  _gain(player, amount, reason) {
    player.money += amount;
    player.totalMoneyEarned += amount;
  }

  _sendToJail(player) {
    player.position = JAIL_POSITION;
    player.inJail = true;
    player.jailTurns = 0;
    this.addLog(`${player.username} was sent to Jail!`);
  }

  _checkMonopoly(userId, color) {
    if (!color) return false;
    const group = COLOR_GROUPS[color];
    if (!group) return false;
    return group.every(id => this.properties[id]?.ownerId === userId);
  }

  _calculateNetWorth(player) {
    let worth = player.money;
    for (const [pos, prop] of Object.entries(this.properties)) {
      if (prop.ownerId === player.userId) {
        const sq = BOARD[parseInt(pos)];
        if (!prop.mortgaged) worth += sq.mortgage;
        worth += (prop.houses || 0) * Math.floor((sq.houseCost || 0) / 2);
        if (prop.hotel) worth += Math.floor((sq.hotelCost || 0) / 2);
      }
    }
    return worth;
  }

  getNetWorths() {
    return this.players.map(p => ({
      userId: p.userId,
      username: p.username,
      netWorth: this._calculateNetWorth(p)
    }));
  }

  _endGame(winner) {
    this.state = 'ended';
    this.endedAt = Date.now();
    this.winner = winner;
    this.addLog(`🎉 ${winner ? winner.username : 'Nobody'} wins the game!`);
  }

  addLog(msg) {
    this.log.push({ ts: Date.now(), msg });
    if (this.log.length > 200) this.log.shift();
  }

  // ─── Serialization ───────────────────────────────────────────────────────────

  getPublicState(forUserId = null) {
    return {
      id: this.id,
      state: this.state,
      settings: this.settings,
      players: this.players.map(p => ({
        userId: p.userId,
        username: p.username,
        avatar: p.avatar,
        money: p.money,
        position: p.position,
        inJail: p.inJail,
        jailTurns: p.jailTurns,
        getOutOfJailCards: p.getOutOfJailCards,
        isBankrupt: p.isBankrupt,
        isConnected: p.isConnected,
        netWorth: this._calculateNetWorth(p)
      })),
      properties: this.properties,
      currentPlayerIndex: this.currentPlayerIndex,
      currentPlayerId: this.currentPlayer?.userId,
      turnPhase: this.turnPhase,
      doublesCount: this.doublesCount,
      lastRoll: this.lastRoll,
      log: this.log.slice(-30),
      freeParkingPot: this.freeParkingPot,
      housesAvailable: this.housesAvailable,
      hotelsAvailable: this.hotelsAvailable,
      auction: this.auction,
      tradeOffer: this.tradeOffer ? {
        ...this.tradeOffer,
        visible: !forUserId || [this.tradeOffer.fromUserId, this.tradeOffer.toUserId].includes(forUserId)
      } : null,
      winner: this.winner ? { userId: this.winner.userId, username: this.winner.username } : null
    };
  }

  getDurationMinutes() {
    if (!this.startedAt) return 0;
    const end = this.endedAt || Date.now();
    return Math.floor((end - this.startedAt) / 60000);
  }

  getResultsForStats() {
    const duration = this.getDurationMinutes();
    return this.players.map((p, idx) => ({
      userId: p.userId,
      won: this.winner?.userId === p.userId,
      netWorth: this._calculateNetWorth(p),
      placement: this.winner?.userId === p.userId ? 1 : idx + 1,
      moneyEarned: p.totalMoneyEarned,
      propertiesBought: p.propertiesBought,
      rentCollected: p.rentCollected,
      rentPaid: p.rentPaid,
      monopolies: p.monopoliesFormed,
      hotels: p.hotelsBuilt,
      durationMinutes: duration,
      bankrupt: p.isBankrupt
    }));
  }
}

module.exports = GameEngine;
