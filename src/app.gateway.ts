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
  roomList : Array<string> = []
  
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
  }

  @SubscribeMessage('getChoose')
  handleClientChoose(@MessageBody() buttonID: string, @ConnectedSocket() client: Socket) : void {
    this.logger.log(`Client ${client.id} clicked button ${buttonID}`)
  }
  
  @SubscribeMessage('createRoom')
  handleCreateRoom(@MessageBody() roomName, @ConnectedSocket() client: Socket) : void {
    client.leave(roomName[0])
    client.join(roomName[1])
    this.logger.log(roomName)
    this.logger.log(`${client.id} left ${roomName[0]}`)
    this.logger.log(`${client.id} joined ${roomName[1]}`)
    this.logger.log(`Clients in room ${roomName[1]}:\n${Array.from(this.server.sockets.adapter.rooms.get(roomName[1]))}`)
  }

  @SubscribeMessage('gameChat')
  handleGameChat(@MessageBody() chatMessage: string, @ConnectedSocket() client: Socket) : void {
    this.server.to(chatMessage[0]).emit(`getChatMessage`, chatMessage[1])
    this.logger.log(`Client ${client.id} send to room ${chatMessage[0]} message:\n${chatMessage[1]}`)
  }

}

