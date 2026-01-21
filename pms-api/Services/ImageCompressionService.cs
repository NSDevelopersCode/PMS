using SkiaSharp;

namespace PMS.API.Services
{
    public interface IImageCompressionService
    {
        Task<byte[]> CompressImageAsync(Stream imageStream, string contentType);
        bool IsImageContentType(string contentType);
    }

    public class ImageCompressionService : IImageCompressionService
    {
        private const int MaxWidth = 1280;
        private const int Quality = 75;

        private static readonly HashSet<string> SupportedImageTypes = new(StringComparer.OrdinalIgnoreCase)
        {
            "image/png",
            "image/jpeg",
            "image/jpg"
        };

        public bool IsImageContentType(string contentType)
        {
            return SupportedImageTypes.Contains(contentType);
        }

        public async Task<byte[]> CompressImageAsync(Stream imageStream, string contentType)
        {
            using var memoryStream = new MemoryStream();
            await imageStream.CopyToAsync(memoryStream);
            memoryStream.Position = 0;

            using var originalBitmap = SKBitmap.Decode(memoryStream);
            if (originalBitmap == null)
            {
                throw new InvalidOperationException("Failed to decode image. The file may be corrupted or not a valid image.");
            }

            // Calculate new dimensions maintaining aspect ratio
            int newWidth = originalBitmap.Width;
            int newHeight = originalBitmap.Height;

            if (originalBitmap.Width > MaxWidth)
            {
                float ratio = (float)MaxWidth / originalBitmap.Width;
                newWidth = MaxWidth;
                newHeight = (int)(originalBitmap.Height * ratio);
            }

            // Resize if needed
            SKBitmap resizedBitmap;
            if (newWidth != originalBitmap.Width || newHeight != originalBitmap.Height)
            {
                resizedBitmap = originalBitmap.Resize(new SKImageInfo(newWidth, newHeight), SKSamplingOptions.Default);
                if (resizedBitmap == null)
                {
                    throw new InvalidOperationException("Failed to resize image.");
                }
            }
            else
            {
                resizedBitmap = originalBitmap;
            }

            try
            {
                using var image = SKImage.FromBitmap(resizedBitmap);
                
                // Determine output format based on content type
                SKEncodedImageFormat format;
                if (contentType.Contains("png", StringComparison.OrdinalIgnoreCase))
                {
                    format = SKEncodedImageFormat.Png;
                }
                else
                {
                    format = SKEncodedImageFormat.Jpeg;
                }

                using var data = image.Encode(format, Quality);
                if (data == null)
                {
                    throw new InvalidOperationException("Failed to encode compressed image.");
                }

                return data.ToArray();
            }
            finally
            {
                // Only dispose if we created a new bitmap
                if (resizedBitmap != originalBitmap)
                {
                    resizedBitmap.Dispose();
                }
            }
        }
    }
}
