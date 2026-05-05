import { describe, it, expect } from 'vitest';
import { productFormSchema } from '../ProductFormWizard.schema';

describe('ProductFormWizard Schema', () => {
	it('should validate valid data', () => {
		const validData = {
			name: 'Valid Product',
			slug: 'valid-product',
			description: 'This is a description.',
			shortDescription: 'Short desc',
			price: '10.00',
			compareAtPrice: '15.00',
			status: 'active',
			stockQuantity: 100,
			lowStockThreshold: 10,
			trackInventory: true,
			isFeatured: false,
		};
		const result = productFormSchema.safeParse(validData);
		expect(result.success).toBe(true);
	});

	it('should fail if name contains special characters (<, >, %)', () => {
		const validData = { // Redefine validData for this test's scope or move it outside describe
			name: 'Valid Product',
			slug: 'valid-product',
			description: 'This is a description.',
			shortDescription: 'Short desc',
			price: '10.00',
			compareAtPrice: '15.00',
			status: 'active',
			stockQuantity: 100,
			lowStockThreshold: 10,
			trackInventory: true,
			isFeatured: false,
		};
		const result = productFormSchema.safeParse({
			...validData,
			name: 'Product <Name>',
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Special characters <, >, and % are not allowed');
		}

		const result2 = productFormSchema.safeParse({
			...validData,
			name: 'Product %Name',
		});
		expect(result2.success).toBe(false);
		if (!result2.success) {
			expect(result2.error.issues[0].message).toContain('Special characters <, >, and % are not allowed');
		}
	});

	it('should reject slugs with special characters', () => {
		const result = productFormSchema.safeParse({
			name: 'Valid Name',
			slug: 'Invalid Slug', // Caps and spaces not allowed
			price: '10.00',
			status: 'draft',
			stockQuantity: 0,
			lowStockThreshold: 0,
			trackInventory: true,
			isFeatured: false
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].path).toContain('slug');
		}
	});

	it('should reject descriptions strictly containing <, >, %', () => {
		const validData = {
			name: 'Valid Name',
			slug: 'valid-slug',
			description: 'This is dangerous <script>',
			price: '10.00',
			status: 'draft',
			stockQuantity: 0,
			lowStockThreshold: 0,
			trackInventory: true,
			isFeatured: false
		};
		const result = productFormSchema.safeParse({
			...validData,
			description: 'Description with <script>',
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Special characters <, >, and % are not allowed');
		}

		const result2 = productFormSchema.safeParse({
			...validData,
			description: 'Description with %',
		});
		expect(result2.success).toBe(false);
		if (!result2.success) {
			expect(result2.error.issues[0].message).toContain('Special characters <, >, and % are not allowed');
		}
	});

	it('should fail if short description contains special characters (<, >, %)', () => {
		const validData = {
			name: 'Valid Product',
			slug: 'valid-product',
			description: 'This is a description.',
			shortDescription: 'Short desc',
			price: '10.00',
			compareAtPrice: '15.00',
			status: 'active',
			stockQuantity: 100,
			lowStockThreshold: 10,
			trackInventory: true,
			isFeatured: false,
		};
		const result = productFormSchema.safeParse({
			...validData,
			shortDescription: 'Short desc with <script>',
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('Special characters <, >, and % are not allowed');
		}

		const result2 = productFormSchema.safeParse({
			...validData,
			shortDescription: 'Short desc with %',
		});
		expect(result2.success).toBe(false);
		if (!result2.success) {
			expect(result2.error.issues[0].message).toContain('Special characters <, >, and % are not allowed');
		}
	});

	it('should reject overly long names', () => {
		const longName = 'a'.repeat(101);
		const result = productFormSchema.safeParse({
			name: longName,
			slug: 'valid-slug',
			price: '10.00',
			status: 'draft',
			stockQuantity: 0,
			lowStockThreshold: 0,
			trackInventory: true,
			isFeatured: false
		});
		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error.issues[0].message).toContain('less than 100 characters');
		}
	});
});
