import { Model } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Post } from '@models/index';

@Injectable()
export class PostRepository extends AbstractRepository<Post> {
  constructor(
    @InjectModel(Post.name) postModel: Model<Post>,
  ) {
    super(postModel);
  }
}