/**
 * Base Repository Class
 * 
 * OOP Concept: Abstraction & Encapsulation
 * - Provides common database operations for all models
 * - Hides database complexity from business logic
 * - Single place to modify database queries
 * 
 * Benefits:
 * - Reusable code across all repositories
 * - Consistent error handling
 * - Easy to mock for testing
 * - Separation of concerns (database logic separate from business logic)
 */

import { NotFoundError, DatabaseError } from '../utils/customErrors.js'
import logger from '../utils/logger.js'

class BaseRepository {
  constructor(model) {
    this.model = model // The Mongoose model this repository manages
    this.modelName = model.modelName // e.g., "Student", "Warden"
  }

  /**
   * Find a document by ID
   * @param {String} id - Document ID
   * @param {Object} options - Query options (select, populate)
   * @returns {Promise<Object>} - Found document
   * @throws {NotFoundError} - If document not found
   */
  async findById(id, options = {}) {
    try {
      let query = this.model.findById(id)

      // Apply select fields if provided
      if (options.select) {
        query = query.select(options.select)
      }

      // Apply populate if provided
      if (options.populate) {
        query = query.populate(options.populate)
      }

      const document = await query.exec()

      if (!document) {
        throw new NotFoundError(`${this.modelName} not found`)
      }

      return document
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error(`Error finding ${this.modelName} by ID:`, error)
      throw new DatabaseError(`Failed to find ${this.modelName}`)
    }
  }

  /**
   * Find one document by filter
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} - Found document or null
   */
  async findOne(filter, options = {}) {
    try {
      let query = this.model.findOne(filter)

      if (options.select) {
        query = query.select(options.select)
      }

      if (options.populate) {
        query = query.populate(options.populate)
      }

      return await query.exec()
    } catch (error) {
      logger.error(`Error finding one ${this.modelName}:`, error)
      throw new DatabaseError(`Failed to find ${this.modelName}`)
    }
  }

  /**
   * Find all documents matching filter
   * @param {Object} filter - Query filter
   * @param {Object} options - Query options (select, populate, sort, limit, skip)
   * @returns {Promise<Array>} - Array of documents
   */
  async findAll(filter = {}, options = {}) {
    try {
      let query = this.model.find(filter)

      if (options.select) {
        query = query.select(options.select)
      }

      if (options.populate) {
        query = query.populate(options.populate)
      }

      if (options.sort) {
        query = query.sort(options.sort)
      }

      if (options.limit) {
        query = query.limit(options.limit)
      }

      if (options.skip) {
        query = query.skip(options.skip)
      }

      return await query.exec()
    } catch (error) {
      logger.error(`Error finding all ${this.modelName}:`, error)
      throw new DatabaseError(`Failed to find ${this.modelName} list`)
    }
  }

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @returns {Promise<Object>} - Created document
   */
  async create(data) {
    try {
      const document = await this.model.create(data)
      logger.info(`${this.modelName} created successfully:`, document._id)
      return document
    } catch (error) {
      logger.error(`Error creating ${this.modelName}:`, error)
      
      // Handle duplicate key error
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0]
        throw new DatabaseError(`${this.modelName} with this ${field} already exists`)
      }
      
      throw new DatabaseError(`Failed to create ${this.modelName}`)
    }
  }

  /**
   * Update a document by ID
   * @param {String} id - Document ID
   * @param {Object} updateData - Data to update
   * @param {Object} options - Update options
   * @returns {Promise<Object>} - Updated document
   */
  async update(id, updateData, options = {}) {
    try {
      const document = await this.model.findByIdAndUpdate(
        id,
        updateData,
        {
          new: true, // Return updated document
          runValidators: true, // Run model validators
          ...options
        }
      )

      if (!document) {
        throw new NotFoundError(`${this.modelName} not found`)
      }

      logger.info(`${this.modelName} updated successfully:`, document._id)
      return document
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error(`Error updating ${this.modelName}:`, error)
      throw new DatabaseError(`Failed to update ${this.modelName}`)
    }
  }

  /**
   * Delete a document by ID
   * @param {String} id - Document ID
   * @returns {Promise<Object>} - Deleted document
   */
  async delete(id) {
    try {
      const document = await this.model.findByIdAndDelete(id)

      if (!document) {
        throw new NotFoundError(`${this.modelName} not found`)
      }

      logger.info(`${this.modelName} deleted successfully:`, document._id)
      return document
    } catch (error) {
      if (error instanceof NotFoundError) throw error
      logger.error(`Error deleting ${this.modelName}:`, error)
      throw new DatabaseError(`Failed to delete ${this.modelName}`)
    }
  }

  /**
   * Count documents matching filter
   * @param {Object} filter - Query filter
   * @returns {Promise<Number>} - Count of documents
   */
  async count(filter = {}) {
    try {
      return await this.model.countDocuments(filter)
    } catch (error) {
      logger.error(`Error counting ${this.modelName}:`, error)
      throw new DatabaseError(`Failed to count ${this.modelName}`)
    }
  }

  /**
   * Check if document exists
   * @param {Object} filter - Query filter
   * @returns {Promise<Boolean>} - True if exists
   */
  async exists(filter) {
    try {
      const count = await this.model.countDocuments(filter).limit(1)
      return count > 0
    } catch (error) {
      logger.error(`Error checking ${this.modelName} existence:`, error)
      throw new DatabaseError(`Failed to check ${this.modelName} existence`)
    }
  }

  /**
   * Paginate results
   * @param {Object} filter - Query filter
   * @param {Object} options - Pagination options (page, limit, sort)
   * @returns {Promise<Object>} - Paginated results with metadata
   */
  async paginate(filter = {}, options = {}) {
    try {
      const page = parseInt(options.page) || 1
      const limit = parseInt(options.limit) || 10
      const skip = (page - 1) * limit

      const [documents, total] = await Promise.all([
        this.findAll(filter, { ...options, skip, limit }),
        this.count(filter)
      ])

      const totalPages = Math.ceil(total / limit)

      return {
        documents,
        pagination: {
          currentPage: page,
          totalPages,
          totalDocuments: total,
          limit,
          hasNextPage: page < totalPages,
          hasPrevPage: page > 1
        }
      }
    } catch (error) {
      logger.error(`Error paginating ${this.modelName}:`, error)
      throw new DatabaseError(`Failed to paginate ${this.modelName}`)
    }
  }
}

export default BaseRepository
