import { BadRequestException, Injectable, InternalServerErrorException, Logger, NotFoundException } from '@nestjs/common';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Inject } from '@nestjs/common';
import { Pool } from 'pg';
import { PaginationDto } from 'src/common/dtos/pagination.dto';
import { validate as isUUID } from 'uuid';

@Injectable()
export class ProductsService {
  deleteAllProducts() {
    throw new Error('Method not implemented.');
  }

  private readonly logger = new Logger('ProductsService');

  constructor(
    @Inject('PG_POOL') private readonly pool: Pool
  ) {}

  async create(createProductDto: CreateProductDto) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      const {
        title,
        price = 0,
        description,
        slug,
        stock = 0,
        sizes,
        gender,
        tags,
        images = []
      } = createProductDto;

      const productInsert = `
        INSERT INTO products 
          (title, price, description, slug, stock, sizes, gender, tags)
        VALUES 
          ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *;
      `;

      const productValues = [
        title, price, description, slug, stock, sizes, gender, tags
      ];

      const result = await client.query(productInsert, productValues);
      const product = result.rows[0];

      // Insertar imágenes si hay
      if (images.length > 0) {
        const imageInserts = images.map((url) => {
          return client.query(
            `INSERT INTO products_images (product_id, url) VALUES ($1, $2)`,
            [product.id, url]
          );
        });

        await Promise.all(imageInserts);
      }

      await client.query('COMMIT');

      return product;
    } catch (error) {
      await client.query('ROLLBACK');
      this.handleDBExceptions(error);
    } finally {
      client.release();
    }
  }


  async findAll(paginationDto: PaginationDto) {
    try {

      const {limit=10, offset=0} = paginationDto;

      const query = `
        SELECT 
          p.*, 
          ARRAY_REMOVE(ARRAY_AGG(pi.url), NULL) AS images
        FROM products p
        LEFT JOIN products_images pi ON pi.product_id = p.id
        GROUP BY p.id
      `;
      
      const result = await this.pool.query(query);
      return result.rows;
    } catch (error) {
      this.handleDBExceptions(error);
    }
}


  async findOne(term: string) {
    try {
      let values: any[] = [];
      let query: string;

      if (isUUID(term)) {
        query = `
          SELECT 
            p.*, 
            ARRAY_REMOVE(ARRAY_AGG(pi.url), NULL) AS images
          FROM products p
          LEFT JOIN products_images pi ON pi.product_id = p.id
          WHERE p.id = $1
          GROUP BY p.id
          LIMIT 1
        `;
        values = [term];
      } else {
        query = `
          SELECT 
            p.*, 
            ARRAY_REMOVE(ARRAY_AGG(pi.url), NULL) AS images
          FROM products p
          LEFT JOIN products_images pi ON pi.product_id = p.id
          WHERE UPPER(p.title) = $1 OR p.slug = $2
          GROUP BY p.id
          LIMIT 1
        `;
        values = [term.toUpperCase(), term.toLowerCase()];
      }

      const result = await this.pool.query(query, values);

      if (result.rowCount === 0) {
        throw new NotFoundException(`Product with term "${term}" not found`);
      }

      return result.rows[0];
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }


  async update(id: string, updateDto: UpdateProductDto) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Verificamos si existe
      const existing = await client.query(
        'SELECT * FROM products WHERE id = $1',
        [id]
      );

      if (existing.rowCount === 0) {
        throw new NotFoundException(`Product with id ${id} not found`);
      }

      this.checkSlugUpdate(updateDto);

      // Separar imágenes del resto del DTO
      const { images, ...rest } = updateDto;

      const fields: string[] = [];
      const values: any[] = [];
      let index = 1;

      for (const [key, value] of Object.entries(rest)) {
        if (value !== undefined) {
          fields.push(`${key} = $${index++}`);
          values.push(value);
        }
      }

      // Si hay campos para actualizar
      if (fields.length > 0) {
        values.push(id); // para el WHERE
        const updateQuery = `
          UPDATE products
          SET ${fields.join(', ')}
          WHERE id = $${index}
          RETURNING *;
        `;
        await client.query(updateQuery, values);
      }

      // Si vienen nuevas imágenes
      if (images && Array.isArray(images)) {
        // Eliminar imágenes anteriores
        await client.query(`DELETE FROM products_images WHERE product_id = $1`, [id]);

        // Insertar nuevas
        const imageInserts = images.map((url) =>
          client.query(
            `INSERT INTO products_images (product_id, url) VALUES ($1, $2)`,
            [id, url]
          )
        );

        await Promise.all(imageInserts);
      }

      await client.query('COMMIT');

      // Retornar producto actualizado con imágenes
      const result = await client.query(
        `
        SELECT 
          p.*, 
          ARRAY_REMOVE(ARRAY_AGG(pi.url), NULL) as images
        FROM products p
        LEFT JOIN products_images pi ON pi.product_id = p.id
        WHERE p.id = $1
        GROUP BY p.id
        `,
        [id]
      );

      return result.rows[0];

    } catch (error) {
      await client.query('ROLLBACK');
      this.handleDBExceptions(error);
    } finally {
      client.release();
    }
  }


  async remove(id: string) {
    try {
      const query = 'DELETE FROM products WHERE id = $1 RETURNING *';
      const result = await this.pool.query(query, [id]);

      if (result.rowCount === 0) {
        throw new BadRequestException(`Product with id ${id} not found`);
      }

      return result.rows[0]; // devuelve el producto eliminado
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  async removeAll() {
    try {
      const query = 'DELETE FROM products RETURNING *';
      const result = await this.pool.query(query);

      return {
        message: `${result.rowCount} products deleted`,
        deletedProducts: result.rows, // opcional: puedes omitir esto si no necesitas los datos
      };
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }


  // Manejo de excepciones de la base de datos
  private handleDBExceptions(error: any) {
    if (error instanceof NotFoundException) {
      throw error; // Re-throw NotFoundException as is
    }
    if (error.code === '23505') {
      throw new BadRequestException(error.detail);
    }
    /* if (error instanceof NotFoundError) {
      throw new NotFoundException(error.message);
    } */
    this.logger.error(error);
    throw new InternalServerErrorException('Unexpected error, check server logs');
  }

  // Método para verificar y formatear el slug
  checkSlugInsert(dto: CreateProductDto) {
    if (!dto.slug) {
      dto.slug = dto.title;
    }

    dto.slug = dto.slug
      .toLowerCase()
      .replaceAll(' ', '_')
      .replaceAll("'", '');
  }


  checkSlugUpdate(dto: UpdateProductDto) {
    if (dto.slug) {
    dto.slug = dto.slug
      .toLowerCase()
      .replaceAll(' ', '_')
      .replaceAll("'", '');
    }
  }

}
