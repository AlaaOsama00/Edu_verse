import { Injectable } from "@nestjs/common";
import { Model } from "mongoose";
import { InjectModel } from "@nestjs/mongoose";
import { AbstractRepository } from "@models/abstract.repository";
import { AcademicRecord } from "./academicRecord.schema";





@Injectable()
export class  AcademicRecordRepository extends AbstractRepository<AcademicRecord> {
    constructor(
      @InjectModel(AcademicRecord.name)protected readonly academicRecord: Model<AcademicRecord>,
    ) {
      super(academicRecord);
    } 

 

    
}