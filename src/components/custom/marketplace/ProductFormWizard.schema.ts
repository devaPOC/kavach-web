import { z } from 'zod';

// Regex to block <, >, and % to prevent XSS and other injection attacks
const SAFE_STRING_REGEX = /^[^<>%]*$/;
const SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const productFormSchema = z.object({
	name: z
		.string()
		.min(1, 'Product name is required')
		.max(100, 'Name must be less than 100 characters')
		.regex(SAFE_STRING_REGEX, 'Special characters <, >, and % are not allowed'),
	slug: z
		.string()
		.min(1, 'URL slug is required')
		.max(100, 'Slug must be less than 100 characters')
		.regex(SLUG_REGEX, 'Slug must contain only lowercase alphanumeric characters and hyphens'),
	description: z
		.string()
		.max(2000, 'Description must be less than 2000 characters')
		.regex(SAFE_STRING_REGEX, 'Special characters <, >, and % are not allowed')
		.optional()
		.or(z.literal('')),
	shortDescription: z
		.string()
		.max(500, 'Short description must be less than 500 characters')
		.regex(SAFE_STRING_REGEX, 'Special characters <, >, and % are not allowed')
		.optional()
		.or(z.literal('')),
	price: z
		.string()
		.min(1, 'Price is required')
		.regex(/^\d+(\.\d{1,2})?$/, 'Invalid price format')
		.refine((val) => parseFloat(val) > 0, 'Price must be greater than 0'),
	compareAtPrice: z
		.string()
		.optional()
		.or(z.literal(''))
		.refine((val) => !val || /^\d+(\.\d{1,2})?$/.test(val), 'Invalid price format'),
	status: z.enum(['draft', 'active', 'archived']),
	stockQuantity: z.coerce.number().min(0, 'Stock cannot be negative'),
	lowStockThreshold: z.coerce.number().min(0, 'Threshold cannot be negative'),
	trackInventory: z.boolean(),
	isFeatured: z.boolean(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export const defaultValues: ProductFormValues = {
	name: '',
	slug: '',
	description: '',
	shortDescription: '',
	price: '',
	compareAtPrice: '',
	status: 'draft',
	stockQuantity: 0,
	lowStockThreshold: 5,
	trackInventory: true,
	isFeatured: false,
};
