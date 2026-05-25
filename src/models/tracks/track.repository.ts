import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Track } from '@models/tracks/track.schema';
import { TrackEnum } from '@utils/enum';
import { AbstractRepository } from '@models/abstract.repository';


@Injectable()
export class TrackRepository extends AbstractRepository<Track> {
  constructor(
    @InjectModel(Track.name) private readonly trackModel: Model<Track>,
  ) {
    super(trackModel)
  }

  async findAll(): Promise<Track[]> {
    return this.trackModel.find().exec();
  }

  async findByName(name: TrackEnum): Promise<Track | null> {
    return this.trackModel.findOne({ name }).exec();
  }

  async createTrack(name: TrackEnum, description: string): Promise<Track> {
    const newTrack = new this.trackModel({ name, description });
    return newTrack.save();
  }
}