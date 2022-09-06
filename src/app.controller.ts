import { Controller, Get, Post } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}
  @Post()
  testPost(): string {
    console.log('Проверка')
    return "Проверка поста";
  }

  @Get()
  getHello(): string {
    return "Сервер запущен";
  }

    @Get('/Test')
  getHelloT(): string {
    return 'tetsweqwe';
  }
}
