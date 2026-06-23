import { User } from '@models/user/user.schema';
import { Model } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';



@Injectable()
export class UserRepository extends AbstractRepository<User> {
  constructor(@InjectModel(User.name) userModel: Model<User>) {
    super(userModel);
  }
  public async findByEmail(email: string)  {
    return await this.findOne({ filter: { email } }); 
  }


}
