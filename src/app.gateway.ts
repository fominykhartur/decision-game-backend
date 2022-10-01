import {
SubscribeMessage,
MessageBody,
ConnectedSocket,
WebSocketGateway,
OnGatewayInit,
WebSocketServer,
OnGatewayConnection,
OnGatewayDisconnect,
} from '@nestjs/websockets';

import { Logger } from '@nestjs/common';
import { Socket, Server } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() 
  server: Server;

  private logger: Logger = new Logger('AppGateway');

  clientCount : number = 0;
  clientList : Array<string> = []
  roomList : Array<object> = []

// roomList = {
//   roomName: string;
//   data: {
//     playerName : string
//   }
// }

  // roomList : Object = {}
  
  afterInit(server: Server) {
    this.logger.log('Init');
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    this.clientCount--;
    this.clientList.splice(this.clientList.indexOf(client.id), 1)
    // this.roomList.forEach(room =>{
    //   room['playersInfo'].forEach(players =>{
    //     if(players['socketID'] === client.id){
    //       this.logger.log(`Test disc ${players['socketID']} from ${room['roomName']}`)
    //       this.server.to(room['roomName']).emit('roomData', room)
    //     }
    //   })
    // })
    this.logger.log(`Num of  connected Clients: ${this.clientCount}\n${this.clientList}`)
    this.server.emit("getClientCount", this.clientCount)
    this.server.emit("getClientList", this.clientList) 
  }

  handleConnection(client: Socket, ...args: any[]) {
    this.logger.log(`Client connected: ${client.id}`);
    this.clientCount++;
    this.clientList.push(client.id)
    this.logger.log(`Num of  connected Clients: ${this.clientCount}\n${this.clientList}`)
    this.server.emit("getClientCount", this.clientCount)
    this.server.emit("getClientList", this.clientList)
    this.server.emit("getRooms", this.roomList)
  }

  @SubscribeMessage('getChoice')
  handleClientChoose(@MessageBody() data: string, @ConnectedSocket() client: Socket) : void {
    this.logger.log(`Client ${client.id} clicked button ${data['buttonID']}`)
    this.roomList.forEach( room => {
      if(room['roomName'] === data['roomName']){
        // console.log(client.id, data['enemySocketID'])
        room['rounds'][data['roundNumber']].playersData.find(player => player.playerSocketID === client.id).playerChoice = data['buttonID']
        room['rounds'][data['roundNumber']].playersData.find(player => player.playerSocketID === data['enemySocketID']).enemyChoice = data['buttonID']
        // console.log(room['rounds'][data['roundNumber']].playersData)
      }
    })
  }
  
  @SubscribeMessage('createRoom')
  handleCreateRoom(@MessageBody() data, @ConnectedSocket() client: Socket) : void {
    client.leave(data['currentRoom'])
    client.join(data['room'])
    // this.roomList.push(data[1])
    this.roomList.push({
      roomName : data['room'],
      playersCount : Array.from(this.server.sockets.adapter.rooms.get(data['room'])).length,
      playersInfo : [{socketID : client.id,
                      playerName : data.playerName,
                      }],
      rounds : []
    })

    this.server.emit("getRooms", this.roomList)
    this.server.to(client.id).emit("joinedGame", true)

    this.roomList.forEach(room =>{
      if(room['roomName'] === data['room']){

        this.logger.log("room data sent")
        this.server.to(data['room']).emit('roomData', room)
      }
    })

    this.logger.log(data)
    this.logger.log(`${client.id} left ${data['currentRoom']}`)
    this.logger.log(`${client.id} joined ${data['room']}`)
    this.logger.log(`Clients in room ${data['room']}:\n${Array.from(this.server.sockets.adapter.rooms.get(data['room']))}`)
  }

  @SubscribeMessage('joinRoom')
  handleChangeRoom(@MessageBody() data, @ConnectedSocket() client:Socket) : void {
    client.leave(data['currentRoom'])
    client.join(data['room'])
    this.server.to(client.id).emit("joinedGame", true)
    this.roomList.forEach(room =>{
      if(room['roomName'] === data['room']){
        room['playersCount'] = Array.from(this.server.sockets.adapter.rooms.get(data['room'])).length
        room['playersInfo'].push({socketID : client.id,
                                  playerName : data.playerName})
        this.logger.log("room data sent")
        this.server.to(data['room']).emit('roomData', room)
      }
    })
    this.server.emit("getRooms", this.roomList)
    this.logger.log(`${client.id} changed room from ${data['currentRoom']} to ${data['room']}`)
    this.logger.log(`Clients in room ${data['room']}:\n${Array.from(this.server.sockets.adapter.rooms.get(data['room']))}`)
  }

  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@MessageBody() data, @ConnectedSocket() client: Socket) : void {
    client.leave(data['roomName'])
    this.server.to(client.id).emit("joinedGame", false)

    this.roomList.forEach(room =>{
      if(room['roomName'] === data['roomName']){
        // this.logger.log(Array.from(this.server.sockets.adapter.rooms.get(data['roomName'])).length)
        room['playersCount']--
        // room['playersCount'] = Array.from(this.server.sockets.adapter.rooms.get(data['roomName'])).length
        room['playersInfo'].push({socketID : client.id,
                                  playerName : data.playerName})
        var leavingPlayerData = room['playersInfo'].find((obj) => { return obj.socketID === client.id })
        room['playersInfo'].splice(room['playersInfo'].indexOf(leavingPlayerData), 1)
        // this.clientList.splice(this.clientList.indexOf(client.id), 1)\
        this.server.to(data['roomName']).emit('roomData', room)
        this.logger.log(`Player ${client.id} leaved room ${data['roomName']}`)
        // this.logger.log(room)
      }
    })
    this.server.emit("getRooms", this.roomList)
  }

  @SubscribeMessage('triggerStart')
  handleTriggerStart(@MessageBody() data, @ConnectedSocket() client: Socket) : void {
    this.server.to(data['roomName']).emit('triggerStartGame')
    this.server.to(client.id).emit('hostStatus', true)
    this.logger.log(`Game in room ${data['roomName']} triggered`)
  }

  @SubscribeMessage('startGame')
  handleGameStart(@MessageBody() data, @ConnectedSocket() client: Socket) : void {
    this.server.to(data['roomName']).emit('gameStatus', true)
    this.roomList.forEach(room => {
      if(room['roomName'] === data['roomName']){
        room['rounds'].push({
                  round : 'round_1',
                  playersData : this.generateGameData(room['playersInfo'])
        })

      this.server.to(data['roomName']).emit('roomData', room)
      // this.server.to(data['roomName']).emit('getGameData', room)
      }
    })
    this.logger.log(`Game started in room ${data['roomName']}`)
  }

  generateGameData(players) : Array<object> {
    var playersData = []
    var enemyList = [...players]
    this.logger.log('Init round')
    players.forEach( player => {

      if(playersData.some(item => item.playerSocketID === player.socketID)){
        return ;
      }

      do{
        var enemyIndex : number = Math.floor(Math.random() * (enemyList.length - 0)) + 0
      }
      while(player === enemyList[enemyIndex])

      playersData.push({
        playerSocketID : player.socketID,
        enemySocketID : enemyList[enemyIndex].socketID,
        playerChoice : 'A',
        enemyChoice : 'A',
        playerCount : 3
      })

      playersData.push({
        playerSocketID : enemyList[enemyIndex].socketID,
        enemySocketID : player.socketID,
        playerChoice : 'A',
        enemyChoice : 'A',
        playerCount : 3
      })
      enemyList.splice(enemyIndex, 1)
      var playerIndex : number = enemyList.indexOf(player)
      enemyList.splice(playerIndex, 1)

    })
    return playersData
  }

  // gameData:roomName,
  // rounds : [
  //   {
  //     roundCount : 'round_1',
  //     playersData : [
        
  //     ]
  //   }
  // ]

  @SubscribeMessage('endRound')
  handleEndRound(@MessageBody() data, @ConnectedSocket() client: Socket) : void {
    this.logger.log('Конец раунда')

    this.roomList.forEach(room =>{
      if(room['roomName'] === data['roomName']){
        console.log(room['rounds'][data['roundNumber']].playersData)
        room['rounds'][data['roundNumber']].playersData.forEach( player =>{
          player['playerCount'] = this.calculateCount(player['playerChoice'], player['enemyChoice'], player['playerCount'])
        })
        console.log(room['rounds'][data['roundNumber']].playersData)
      }
    })
  }

calculateCount(playerChoice, enemyChoice, count) : number {
  console.log('______________',playerChoice + enemyChoice)
  switch (playerChoice + enemyChoice){
    case 'AA': return count += 2
    case 'AB': return count -= 3
    case 'BA': return count += 3
    case 'BB': return count 
  }
}

  @SubscribeMessage('gameChat')
  handleGameChat(@MessageBody() chatMessage: string, @ConnectedSocket() client: Socket) : void {
    this.server.to(chatMessage[0]).emit(`getChatMessage`, chatMessage[1])
    this.logger.log(`Client ${client.id} send to room ${chatMessage[0]} message:\n${chatMessage[1]}`)
  }
}

