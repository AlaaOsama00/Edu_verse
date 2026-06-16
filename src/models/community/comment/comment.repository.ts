import { Model } from 'mongoose';
import { AbstractRepository } from '@models/abstract.repository';
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Comment } from './comment.schema';


@Injectable()
export class CommentRepository extends AbstractRepository<Comment> {
  constructor(
    @InjectModel(Comment.name) commentModel: Model<Comment>,
  ) {
    super(commentModel);
  }
}