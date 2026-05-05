export interface TrainerResource {
	id: string;
	title: string;
	description?: string | null;
	resourceType: 'document' | 'video' | 'article' | 'course';
	contentUrl?: string | null;
	contentData?: any;
	thumbnailUrl?: string | null;
	category?: string | null;
	tags?: string[] | null;
	isPublished: boolean;
	// File upload fields
	fileName?: string | null;
	fileSize?: number | null;
	fileType?: string | null;
	r2Key?: string | null;
	createdBy: string;
	createdAt: Date | string;
	updatedAt: Date | string;
}

export interface CreateResourceData {
	title: string;
	description?: string;
	resourceType: 'document' | 'video' | 'article' | 'course';
	contentUrl?: string;
	contentData?: any;
	thumbnailUrl?: string;
	category?: string;
	tags?: string[];
	isPublished?: boolean;
	// File upload fields
	fileName?: string;
	fileSize?: number;
	fileType?: string;
	r2Key?: string;
}

export interface UpdateResourceData {
	title?: string;
	description?: string;
	resourceType?: 'document' | 'video' | 'article' | 'course';
	contentUrl?: string;
	contentData?: any;
	thumbnailUrl?: string;
	category?: string;
	tags?: string[];
	isPublished?: boolean;
	// File upload fields
	fileName?: string;
	fileSize?: number;
	fileType?: string;
	r2Key?: string;
}
