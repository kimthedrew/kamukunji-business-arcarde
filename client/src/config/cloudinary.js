// Cloudinary configuration for frontend
export const cloudinaryConfig = {
  cloudName: 'dqs267r6d',
  uploadPreset: 'kba-products' // We'll create this preset in Cloudinary dashboard
};

// Helper function to generate Cloudinary URLs
export const getCloudinaryUrl = (publicId, options = {}) => {
  const baseUrl = `https://res.cloudinary.com/${cloudinaryConfig.cloudName}/image/upload`;
  const transformations = [];
  
  // Default transformations
  if (options.width) transformations.push(`w_${options.width}`);
  if (options.height) transformations.push(`h_${options.height}`);
  if (options.crop) transformations.push(`c_${options.crop}`);
  if (options.quality) transformations.push(`q_${options.quality}`);
  if (options.format) transformations.push(`f_${options.format}`);
  
  const transformString = transformations.length > 0 ? `/${transformations.join(',')}` : '';
  return `${baseUrl}${transformString}/${publicId}`;
};


