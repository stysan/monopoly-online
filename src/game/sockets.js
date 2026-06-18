const { socketAuth } = require('../middleware/auth');
const roomManager = require('../game/roomManager');
const db = require('../db/database');

module.exports = function setupSockets(io) {
  io.use(socketAuth);

  io.on('connection', (socket) => {
    const user = socket.user;
    console.log(`[SOCKET] ${user.username} connected`);
    db.setUserOnline(user.id, true);
    io.emit('online_count', db.getOnlineCount());

    // ─── Lobby ────────────────────────────────────────────────────────────────

    socket.on('get_rooms', () => {
      socket.emit('rooms_list', roomManager.getPublicRooms());
    });

    socket.on('create_room', (options = {}) => {
      // Leave current room first
      const currentGameId = roomManager.getGameIdByUser(user.id);
      if (currentGameId) {
        _leaveRoom(socket, user);
      }

      const gameId = roomManager.createRoom(user.id, user.username, user.avatar, options);
      socket.join(gameId);
      socket.emit('room_created', { gameId });
      socket.emit('game_state', roomManager.getRoom(gameId).engine.getPublicState(user.id));
      io.emit('rooms_list', roomManager.getPublicRooms());
    });

    socket.on('join_room', ({ gameId }) => {
      const currentGameId = roomManager.getGameIdByUser(user.id);
      if (currentGameId === gameId) {
        // Rejoin — just sync state
        socket.join(gameId);
        const room = roomManager.getRoom(gameId);
        if (room) {
          const p = room.engine.getPlayer(user.id);
          if (p) p.isConnected = true;
          socket.emit('game_state', room.engine.getPublicState(user.id));
        }
        return;
      }
      if (currentGameId) _leaveRoom(socket, user);

      const result = roomManager.joinRoom(gameId, user.id, user.username, user.avatar);
      if (result.error) return socket.emit('error', result.error);

      socket.join(gameId);
      const room = roomManager.getRoom(gameId);
      socket.emit('game_state', room.engine.getPublicState(user.id));
      io.to(gameId).emit('player_joined', { username: user.username, avatar: user.avatar });
      _broadcastState(io, gameId, room.engine);
      io.emit('rooms_list', roomManager.getPublicRooms());
    });

    socket.on('leave_room', () => {
      _leaveRoom(socket, user);
      socket.emit('left_room');
      io.emit('rooms_list', roomManager.getPublicRooms());
    });

    socket.on('start_game', () => {
      const gameId = roomManager.getGameIdByUser(user.id);
      const room = roomManager.getRoom(gameId);
      if (!room) return socket.emit('error', 'Not in a room');
      if (room.hostUserId !== user.id) return socket.emit('error', 'Only host can start');

      const result = room.engine.start();
      if (result.error) return socket.emit('error', result.error);

      io.to(gameId).emit('game_started');
      _broadcastState(io, gameId, room.engine);
      io.emit('rooms_list', roomManager.getPublicRooms());
    });

    // ─── Game Actions ─────────────────────────────────────────────────────────

    socket.on('roll_dice', () => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.rollDice();
      if (result.error) return socket.emit('error', result.error);

      io.to(gameId).emit('dice_rolled', {
        userId: user.id,
        username: user.username,
        roll: result.roll,
        event: result
      });
      _broadcastState(io, gameId, room.engine);
      _checkGameEnd(io, gameId, room);
    });

    socket.on('buy_property', () => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.buyProperty(user.id);
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('decline_buy', () => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.declineBuy(user.id);
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('end_turn', () => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.endTurn(user.id);
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('pay_jail_fine', () => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.payJailFine(user.id);
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('use_jail_card', () => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.useJailCard(user.id);
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('build_house', ({ pos }) => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.buildHouse(user.id, parseInt(pos));
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('sell_house', ({ pos }) => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.sellHouse(user.id, parseInt(pos));
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('mortgage', ({ pos }) => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.mortgageProperty(user.id, parseInt(pos));
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('unmortgage', ({ pos }) => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.unmortgageProperty(user.id, parseInt(pos));
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('place_bid', ({ amount }) => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.placeBid(user.id, parseInt(amount));
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('end_auction', () => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');
      if (room.hostUserId !== user.id && room.engine.currentPlayer.userId !== user.id)
        return socket.emit('error', 'Cannot end auction');

      const result = room.engine.endAuction();
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('offer_trade', ({ toUserId, offer }) => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.offerTrade(user.id, toUserId, offer);
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('respond_trade', ({ accept }) => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.respondTrade(user.id, accept);
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
    });

    socket.on('declare_bankruptcy', () => {
      const { gameId, room } = _getRoom(user.id);
      if (!room) return socket.emit('error', 'Not in a game');

      const result = room.engine.declareBankruptcy(user.id);
      if (result.error) return socket.emit('error', result.error);

      _broadcastState(io, gameId, room.engine);
      _checkGameEnd(io, gameId, room);
    });

    socket.on('chat_message', ({ text }) => {
      const gameId = roomManager.getGameIdByUser(user.id);
      if (!gameId) return;
      if (!text || text.length > 200) return;
      io.to(gameId).emit('chat_message', {
        username: user.username,
        avatar: user.avatar,
        text: text.slice(0, 200),
        ts: Date.now()
      });
    });

    // ─── Disconnect ───────────────────────────────────────────────────────────

    socket.on('disconnect', () => {
      console.log(`[SOCKET] ${user.username} disconnected`);
      db.setUserOnline(user.id, false);
      io.emit('online_count', db.getOnlineCount());

      const gameId = roomManager.getGameIdByUser(user.id);
      if (gameId) {
        const room = roomManager.getRoom(gameId);
        if (room) {
          const p = room.engine.getPlayer(user.id);
          if (p) p.isConnected = false;
          _broadcastState(io, gameId, room.engine);
        }
      }
    });
  });

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  function _getRoom(userId) {
    const gameId = roomManager.getGameIdByUser(userId);
    const room = roomManager.getRoom(gameId);
    return { gameId, room };
  }

  function _leaveRoom(socket, user) {
    const gameId = roomManager.getGameIdByUser(user.id);
    if (!gameId) return;
    roomManager.leaveRoom(user.id);
    socket.leave(gameId);
    io.to(gameId).emit('player_left', { username: user.username });
    const room = roomManager.getRoom(gameId);
    if (room) _broadcastState(io, gameId, room.engine);
  }

  function _broadcastState(io, gameId, engine) {
    // Send personalized state to each player
    const sockets = io.sockets.adapter.rooms.get(gameId);
    if (!sockets) {
      // Fallback: broadcast same state
      io.to(gameId).emit('game_state', engine.getPublicState());
      return;
    }
    for (const socketId of sockets) {
      const s = io.sockets.sockets.get(socketId);
      if (s?.user) {
        s.emit('game_state', engine.getPublicState(s.user.id));
      }
    }
  }

  async function _checkGameEnd(io, gameId, room) {
    if (room.engine.state === 'ended') {
      io.to(gameId).emit('game_ended', {
        winner: room.engine.winner
          ? { userId: room.engine.winner.userId, username: room.engine.winner.username }
          : null,
        finalState: room.engine.getPublicState()
      });
      await roomManager.finalizeGame(gameId);
      // Clean up after 5 minutes
      setTimeout(() => roomManager.endRoom(gameId), 5 * 60 * 1000);
    }
  }
};
