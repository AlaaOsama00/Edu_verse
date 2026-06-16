import { Model } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClubResource } from '@models/index';

@Injectable()
export class ClubResourceRepository extends AbstractRepository<ClubResource> {
  constructor(
    @InjectModel(ClubResource.name)
    clubResourceModel: Model<ClubResource>,
  ) {
    super(clubResourceModel);
  }
}