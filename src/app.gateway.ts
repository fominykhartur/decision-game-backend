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

  @SubscribeMessage('getChoose')
  handleClientChoose(@MessageBody() buttonID: string, @ConnectedSocket() client: Socket) : void {
    this.logger.log(`Client ${client.id} clicked button ${buttonID}`)
  }
  
  @SubscribeMessage('createRoom')
  handleCreateRoom(@MessageBody() data, @ConnectedSocket() client: Socket) : void {
    client.leave(data['currentRoom'])
    client.join(data['room'])
    // this.roomList.push(data[1])
    this.roomList.push({
      roomName : data['room'],
      playersCount : Array.from(this.server.sockets.adapter.rooms.get(data['room'])).length,
      playersSocketID : [client.id]
    })
    this.server.emit("getRooms", this.roomList)
    this.logger.log(data)
    this.logger.log(`${client.id} left ${data['currentRoom']}`)
    this.logger.log(`${client.id} joined ${data['room']}`)
    this.logger.log(`Clients in room ${data['room']}:\n${Array.from(this.server.sockets.adapter.rooms.get(data['room']))}`)
  }

  @SubscribeMessage('joinRoom')
  handleChangeRoom(@MessageBody() roomName, @ConnectedSocket() client:Socket) : void {
    client.leave(roomName[0])
    client.join(roomName[1])
    this.logger.log('zxcasdqw')
    this.roomList.forEach(room =>{
      this.logger.log('qwezxc', room)
      if(room['roomName'] === roomName[1]){
        room['playersCount'] = Array.from(this.server.sockets.adapter.rooms.get(roomName[1])).length
        room['playersSocketID'].push(client.id)
      }
    })
    this.server.emit("getRooms", this.roomList)
    this.logger.log(`${client.id} changed room from ${roomName[0]} to ${roomName[1]}`)
    this.logger.log(`Clients in room ${roomName[1]}:\n${Array.from(this.server.sockets.adapter.rooms.get(roomName[1]))}`)
  }

  @SubscribeMessage('gameChat')
  handleGameChat(@MessageBody() chatMessage: string, @ConnectedSocket() client: Socket) : void {
    this.server.to(chatMessage[0]).emit(`getChatMessage`, chatMessage[1])
    this.logger.log(`Client ${client.id} send to room ${chatMessage[0]} message:\n${chatMessage[1]}`)
  }

}
