import { Firestore, Timestamp, WriteBatch } from '@google-cloud/firestore';
import { v4 as uuidv4 } from 'uuid';
import { 
  Product, 
  CreateProductRequest, 
  UpdateProductRequest,
  ProductFilters,
  PaginationParams,
  PaginatedResponse,
  NotFoundError,
  ConflictError,
  ValidationError,
  DatabaseError
} from '../../../shared/src/types';
import { logger } from '../utils/logger';
import { AuditService } from './AuditService';
import { StockAlertService } from './StockAlertService';

export class ProductService {
  private db: Firestore;
  private auditService: AuditService;
  private stockAlertService: StockAlertService;

  constructor(db: Firestore) {
    this.db = db;
    this.auditService = new AuditService(db);
    this.stockAlertService = new StockAlertService(db);
  }

  /**
   * Create a new product
   */
  async createProduct(productData: CreateProductRequest, userId: string): Promise<Product> {
    try {
      // Check if SKU already exists
      await this.validateUniqueSKU(productData.sku);
      
      // Check if barcode already exists (if provided)
      if (productData.barcode) {
        await this.validateUniqueBarcode(productData.barcode);
      }

      const productId = uuidv4();
      const now = Timestamp.now();

      const product: Product = {
        id: productId,
        ...productData,
        inventory: {
          ...productData.inventory,
          currentStock: 0 // Initial stock is always 0
        },
        media: {
          images: [],
          documents: [],
          ...productData.specifications
        },
        tags: productData.tags || [],
        isActive: true,
        isFeatured: false,
        createdAt: now,
        updatedAt: now,
        createdBy: userId
      };

      // Save product to Firestore
      await this.db.collection('products').doc(productId).set(product);

      // Log audit trail
      await this.auditService.log({
        userId,
        action: 'create',
        resource: 'product',
        resourceId: productId,
        changes: { after: product }
      });

      logger.info(`Product created successfully`, { productId, sku: product.sku, userId });
      
      return product;
    } catch (error) {
      logger.error('Error creating product', { error, productData, userId });
      throw error;
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(productId: string): Promise<Product> {
    try {
      const doc = await this.db.collection('products').doc(productId).get();
      
      if (!doc.exists) {
        throw new NotFoundError('Product', productId);
      }

      return { id: doc.id, ...doc.data() } as Product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error fetching product', { error, productId });
      throw new DatabaseError('Failed to fetch product');
    }
  }

  /**
   * Get product by SKU
   */
  async getProductBySKU(sku: string): Promise<Product> {
    try {
      const snapshot = await this.db.collection('products')
        .where('sku', '==', sku)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new NotFoundError('Product with SKU', sku);
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error fetching product by SKU', { error, sku });
      throw new DatabaseError('Failed to fetch product by SKU');
    }
  }

  /**
   * Get product by barcode
   */
  async getProductByBarcode(barcode: string): Promise<Product> {
    try {
      const snapshot = await this.db.collection('products')
        .where('barcode', '==', barcode)
        .where('isActive', '==', true)
        .limit(1)
        .get();

      if (snapshot.empty) {
        throw new NotFoundError('Product with barcode', barcode);
      }

      const doc = snapshot.docs[0];
      return { id: doc.id, ...doc.data() } as Product;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      logger.error('Error fetching product by barcode', { error, barcode });
      throw new DatabaseError('Failed to fetch product by barcode');
    }
  }

  /**
   * Update product
   */
  async updateProduct(
    productId: string, 
    updateData: Partial<UpdateProductRequest>, 
    userId: string
  ): Promise<Product> {
    try {
      // Get current product
      const currentProduct = await this.getProductById(productId);

      // Validate SKU uniqueness if it's being changed
      if (updateData.sku && updateData.sku !== currentProduct.sku) {
        await this.validateUniqueSKU(updateData.sku, productId);
      }

      // Validate barcode uniqueness if it's being changed
      if (updateData.barcode && updateData.barcode !== currentProduct.barcode) {
        await this.validateUniqueBarcode(updateData.barcode, productId);
      }

      const updatedProduct: Product = {
        ...currentProduct,
        ...updateData,
        id: productId,
        updatedAt: Timestamp.now(),
        // Prevent updating certain fields
        createdAt: currentProduct.createdAt,
        createdBy: currentProduct.createdBy
      };

      // Update in Firestore
      await this.db.collection('products').doc(productId).set(updatedProduct);

      // Check for stock alerts if inventory settings changed
      if (updateData.inventory) {
        await this.stockAlertService.checkStockLevels(productId);
      }

      // Log audit trail
      await this.auditService.log({
        userId,
        action: 'update',
        resource: 'product',
        resourceId: productId,
        changes: { 
          before: currentProduct, 
          after: updatedProduct 
        }
      });

      logger.info(`Product updated successfully`, { productId, userId });
      
      return updatedProduct;
    } catch (error) {
      logger.error('Error updating product', { error, productId, updateData, userId });
      throw error;
    }
  }

  /**
   * Delete product (soft delete)
   */
  async deleteProduct(productId: string, userId: string): Promise<void> {
    try {
      const product = await this.getProductById(productId);

      // Check if product has stock
      if (product.inventory.currentStock > 0) {
        throw new ConflictError('Cannot delete product with existing stock');
      }

      // Soft delete
      const updatedProduct = {
        ...product,
        isActive: false,
        updatedAt: Timestamp.now()
      };

      await this.db.collection('products').doc(productId).set(updatedProduct);

      // Log audit trail
      await this.auditService.log({
        userId,
        action: 'delete',
        resource: 'product',
        resourceId: productId,
        changes: { 
          before: product, 
          after: updatedProduct 
        }
      });

      logger.info(`Product deleted successfully`, { productId, userId });
    } catch (error) {
      logger.error('Error deleting product', { error, productId, userId });
      throw error;
    }
  }

  /**
   * Get products with filters and pagination
   */
  async getProducts(
    filters: ProductFilters = {}, 
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Product>> {
    try {
      const { 
        page = 1, 
        limit = 20, 
        sortBy = 'updatedAt', 
        sortOrder = 'desc' 
      } = pagination;

      let query = this.db.collection('products').where('isActive', '==', true);

      // Apply filters
      if (filters.categoryId) {
        query = query.where('categoryId', '==', filters.categoryId);
      }
      
      if (filters.supplierId) {
        query = query.where('supplierId', '==', filters.supplierId);
      }
      
      if (filters.brand) {
        query = query.where('brand', '==', filters.brand);
      }
      
      if (filters.isFeatured !== undefined) {
        query = query.where('isFeatured', '==', filters.isFeatured);
      }

      if (filters.tags && filters.tags.length > 0) {
        query = query.where('tags', 'array-contains-any', filters.tags);
      }

      // Apply sorting
      query = query.orderBy(sortBy, sortOrder);

      // Get total count
      const totalSnapshot = await query.get();
      const total = totalSnapshot.size;

      // Apply pagination
      const offset = (page - 1) * limit;
      const paginatedQuery = query.offset(offset).limit(limit);
      const snapshot = await paginatedQuery.get();

      const products: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));

      // Filter by price and stock ranges (client-side filtering)
      let filteredProducts = products;
      
      if (filters.minPrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.pricing.salePrice >= filters.minPrice!);
      }
      
      if (filters.maxPrice !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.pricing.salePrice <= filters.maxPrice!);
      }
      
      if (filters.minStock !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.inventory.currentStock >= filters.minStock!);
      }
      
      if (filters.maxStock !== undefined) {
        filteredProducts = filteredProducts.filter(p => p.inventory.currentStock <= filters.maxStock!);
      }

      const totalPages = Math.ceil(total / limit);

      return {
        data: filteredProducts,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error fetching products', { error, filters, pagination });
      throw new DatabaseError('Failed to fetch products');
    }
  }

  /**
   * Search products by text
   */
  async searchProducts(
    query: string, 
    pagination: PaginationParams = {}
  ): Promise<PaginatedResponse<Product>> {
    try {
      const { limit = 20 } = pagination;
      
      // Search in multiple fields
      const searchTerms = query.toLowerCase().split(' ');
      
      // This is a simplified search - in production, consider using Algolia or Elasticsearch
      const snapshot = await this.db.collection('products')
        .where('isActive', '==', true)
        .get();

      const allProducts: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));

      // Client-side search (consider server-side search for better performance)
      const filteredProducts = allProducts.filter(product => {
        const searchableText = [
          product.name,
          product.description,
          product.sku,
          product.barcode,
          product.brand,
          product.model,
          ...product.tags
        ].join(' ').toLowerCase();

        return searchTerms.every(term => searchableText.includes(term));
      });

      // Apply pagination to search results
      const page = pagination.page || 1;
      const offset = (page - 1) * limit;
      const paginatedResults = filteredProducts.slice(offset, offset + limit);
      const total = filteredProducts.length;
      const totalPages = Math.ceil(total / limit);

      return {
        data: paginatedResults,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1
        }
      };
    } catch (error) {
      logger.error('Error searching products', { error, query, pagination });
      throw new DatabaseError('Failed to search products');
    }
  }

  /**
   * Update product stock
   */
  async updateStock(productId: string, newStock: number, userId: string): Promise<Product> {
    try {
      const product = await this.getProductById(productId);
      const previousStock = product.inventory.currentStock;

      const updatedProduct = {
        ...product,
        inventory: {
          ...product.inventory,
          currentStock: newStock
        },
        updatedAt: Timestamp.now()
      };

      await this.db.collection('products').doc(productId).set(updatedProduct);

      // Check stock alerts
      await this.stockAlertService.checkStockLevels(productId);

      // Log audit trail
      await this.auditService.log({
        userId,
        action: 'update',
        resource: 'product',
        resourceId: productId,
        changes: { 
          before: { stock: previousStock }, 
          after: { stock: newStock }
        }
      });

      logger.info(`Product stock updated`, { 
        productId, 
        previousStock, 
        newStock, 
        userId 
      });

      return updatedProduct;
    } catch (error) {
      logger.error('Error updating product stock', { error, productId, newStock, userId });
      throw error;
    }
  }

  /**
   * Get low stock products
   */
  async getLowStockProducts(): Promise<Product[]> {
    try {
      const snapshot = await this.db.collection('products')
        .where('isActive', '==', true)
        .get();

      const products: Product[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Product));

      // Filter products with stock below minimum
      return products.filter(product => 
        product.inventory.currentStock <= product.inventory.minStock
      );
    } catch (error) {
      logger.error('Error fetching low stock products', { error });
      throw new DatabaseError('Failed to fetch low stock products');
    }
  }

  /**
   * Validate unique SKU
   */
  private async validateUniqueSKU(sku: string, excludeProductId?: string): Promise<void> {
    const snapshot = await this.db.collection('products')
      .where('sku', '==', sku)
      .where('isActive', '==', true)
      .get();

    const existingProduct = snapshot.docs.find(doc => doc.id !== excludeProductId);
    
    if (existingProduct) {
      throw new ConflictError(`Product with SKU '${sku}' already exists`);
    }
  }

  /**
   * Validate unique barcode
   */
  private async validateUniqueBarcode(barcode: string, excludeProductId?: string): Promise<void> {
    const snapshot = await this.db.collection('products')
      .where('barcode', '==', barcode)
      .where('isActive', '==', true)
      .get();

    const existingProduct = snapshot.docs.find(doc => doc.id !== excludeProductId);
    
    if (existingProduct) {
      throw new ConflictError(`Product with barcode '${barcode}' already exists`);
    }
  }

  /**
   * Bulk update products
   */
  async bulkUpdateProducts(
    updates: Array<{ id: string; data: Partial<UpdateProductRequest> }>,
    userId: string
  ): Promise<void> {
    try {
      const batch: WriteBatch = this.db.batch();
      const timestamp = Timestamp.now();

      for (const update of updates) {
        const productRef = this.db.collection('products').doc(update.id);
        const currentProduct = await this.getProductById(update.id);
        
        const updatedProduct = {
          ...currentProduct,
          ...update.data,
          updatedAt: timestamp
        };

        batch.set(productRef, updatedProduct);
      }

      await batch.commit();

      logger.info(`Bulk update completed`, { 
        updatedCount: updates.length, 
        userId 
      });
    } catch (error) {
      logger.error('Error in bulk update', { error, updates, userId });
      throw new DatabaseError('Failed to perform bulk update');
    }
  }
}