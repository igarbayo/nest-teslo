import { ProductImage } from "./product-image.entity";

export class Product {
    title: string;
    price?: number;
    description?: string;
    slug?: string;
    stock?: number;
    sizes: string[];
    gender: string;

    tags: string[];

    images?: ProductImage[];
    
}

