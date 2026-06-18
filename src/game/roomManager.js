const { v4: uuidv4 } = require('uuid');
const GameEngine = require('./engine');
const db = require('../db/database');

class RoomManager {
  constructor() {
    this.rooms = new Map(); // gameId -> { engine, hostUserId, isPublic, name }
    this.userToRoom = new Map(); // userId -> gameId
  }

  createRoom(hostUserId, hostUsername, hostAvatar, options = {}) {
    const gameId = uuidv4().slice(0, 8).toUpperCase();
    const engine = new GameEngine(gameId, options.settings);
    engine.addPlayer(hostUserId, hostUsername, hostAvatar);

    this.rooms.set(gameId, {
      engine,
      hostUserId,
      isPublic: options.isPublic !== false,
      name: options.name || `${hostUsername}'s Game`
    });
    this.userToRoom.set(hostUserId, gameId);
    return gameId;
  }

  joinRoom(gameId, userId, username, avatar) {
    const room = this.rooms.get(gameId);
    if (!room) return { error: 'Room not found' };
    if (room.engine.state !== 'lobby') return { error: 'Game already started' };

    const result = room.engine.addPlayer(userId, username, avatar);
    if (result.error) return result;
    this.userToRoom.set(userId, gameId);
    return { success: true };
  }

  leaveRoom(userId) {
    const gameId = this.userToRoom.get(userId);
    if (!gameId) return;
    const room = this.rooms.get(gameId);
    if (!room) return;
    room.engine.removePlayer(userId);
    this.userToRoom.delete(userId);

    // If lobby and empty, remove
    if (room.engine.state === 'lobby' && room.engine.players.length === 0) {
      this.rooms.delete(gameId);
    }
  }

  getRoom(gameId) { return this.rooms.get(gameId); }
  getRoomByUser(userId) { return this.rooms.get(this.userToRoom.get(userId)); }
  getGameIdByUser(userId) { return this.userToRoom.get(userId); }

  endRoom(gameId) {
    const room = this.rooms.get(gameId);
    if (!room) return;
    for (const p of room.engine.players) {
      this.userToRoom.delete(p.userId);
    }
    this.rooms.delete(gameId);
  }

  getPublicRooms() {
    const list = [];
    for (const [id, room] of this.rooms) {
      if (room.isPublic && room.engine.state === 'lobby') {
        list.push({
          id,
          name: room.name,
          host: room.engine.players[0]?.username || '?',
          players: room.engine.players.length,
          maxPlayers: room.engine.settings.maxPlayers,
          settings: {
            auctionEnabled: room.engine.settings.auctionEnabled,
            freeParkingJackpot: room.engine.settings.freeParkingJackpot
          }
        });
      }
    }
    return list;
  }

  async finalizeGame(gameId) {
    const room = this.rooms.get(gameId);
    if (!room) return;
    const engine = room.engine;
    if (engine.state !== 'ended') return;

    const results = engine.getResultsForStats();
    const userResults = results.filter(r => r.userId && typeof r.userId === 'number');

    if (userResults.length > 0) {
      db.saveGameHistory(
        gameId,
        engine.winner?.userId || null,
        engine.getDurationMinutes(),
        engine.players.length
      );
      db.updateStatsAfterGame(gameId, userResults);
    }
  }
}

module.exports = new RoomManager(); // singleton
