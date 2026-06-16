import { Model } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { ClubMembership } from '@models/index';

@Injectable()
export class ClubMembershipRepository extends AbstractRepository<ClubMembership> {
  constructor(
    @InjectModel(ClubMembership.name)
    clubMembershipModel: Model<ClubMembership>,
  ) {
    super(clubMembershipModel);
  }
}