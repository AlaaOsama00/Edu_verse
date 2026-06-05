import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import { StudyPlan } from './studyPlan.schema';

@Injectable()
export class StudyPlanRepository extends AbstractRepository<StudyPlan> {
  constructor(
    @InjectModel(StudyPlan.name) studyPlanModel: Model<StudyPlan>,
  ) {
    super(studyPlanModel);
  }



 
}