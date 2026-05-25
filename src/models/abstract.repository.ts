
import {
  Model,
  MongooseBaseQueryOptions,
  ProjectionType,
  QueryOptions,
  Types,
  UpdateQuery,
  FilterQuery,
  ObjectId,
} from 'mongoose'
import { filter } from 'rxjs'


export abstract class AbstractRepository<T> {

  constructor(protected readonly model: Model<T>) {}
   async create( data: any ) : Promise<T> {
    return await this.model.create(data)
  }
  
  async insertMany(data: any[ ]) {
    return await this.model.insertMany(data)
  }

  async find(
    filter: FilterQuery<T>,
    projection?: ProjectionType<T>,
    options?: QueryOptions<T>
  ) {
    return await this.model.find(filter || {}, projection, options)
  }

  async findOne({
    filter={},
    projection = {},
    options = {},
  }: {
    filter?: FilterQuery<T> 
    projection?: ProjectionType<T>
    options?: QueryOptions<T>
  }) {
    return await this.model.findOne(filter, projection, options)
  }

  async findById(
    id: string | Types.ObjectId,
    projection?: ProjectionType<T>,
    options?: QueryOptions<T>
  ) {
    return await this.model.findById(id, projection, options);
  }


  async findAll(): Promise<T[]> {
    return await this.model.find().exec();
  }


  async update({
    filter={},
    update={},
    options = {},
  }: {
    filter: FilterQuery<T>
    update: UpdateQuery<T>
    options?: QueryOptions<T>
  }) {
    return await this.model.findOneAndUpdate(filter, update, options)
  }

   async findByIdAndUpdate({
    id,
    update,
    options = {},
  }: {
    id: string | Types.ObjectId
    update: UpdateQuery<T>
    options?: QueryOptions<T>
  }) {
    return await this.model.findByIdAndUpdate(id, update, options)
  }
  
  async findByIdAndDelete({
    id,
    options,
  }: {
    id?: string | Types.ObjectId
    options?: QueryOptions<T>
  }) {
    return await this.model.findByIdAndDelete(id, options)
  }

  async findOneAndDelete({
    filter={},
    options = {},
  }: {
    filter?: FilterQuery<T>
    options?: QueryOptions<T>
  }) {
    return await this.model.findOneAndDelete(filter, options)
  }

  async findOneAndUpdate({
    filter={},
    update={},
    options = {},
  }: {
    filter: FilterQuery<T> 
    update: UpdateQuery<T>
    options?: QueryOptions<T>
  }) {
    return await this.model.findOneAndUpdate(filter, update, options)
  }

  async deleteOne({
    filter={},
    options = {},
  }: {
    filter: FilterQuery<T>
    options?: MongooseBaseQueryOptions<T>
  }) {
    return await this.model.deleteOne(filter, options)
  }

  async deleteMany({
    filter={},
    options = {},
  }: {
    filter: FilterQuery<T>
    options?: MongooseBaseQueryOptions<T>
  }) {
    return await this.model.deleteMany(filter, options)
  }

}

