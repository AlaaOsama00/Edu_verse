import { Model } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Club } from '@models/index';

@Injectable()
export class ClubRepository extends AbstractRepository<Club> {
  constructor(
    @InjectModel(Club.name) clubModel: Model<Club>,
  ) {
    super(clubModel);
  }
}