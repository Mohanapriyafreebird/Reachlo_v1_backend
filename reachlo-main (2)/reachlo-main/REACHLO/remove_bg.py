from rembg import remove
from PIL import Image

input_path = r"D:\REACHLO\REACHLO\assets\seller_login\image 4 seller.png"
output_path = r"D:\REACHLO\REACHLO\assets\seller_login\image 4 seller.png"

# Read the image
try:
    with open(input_path, 'rb') as i:
        input_image = i.read()
    
    print("Processing image to remove background...")
    # Remove the background
    output_image = remove(input_image)

    # Write the output image back
    with open(output_path, 'wb') as o:
        o.write(output_image)
    
    print("Successfully removed background!")
except Exception as e:
    print(f"Error: {e}")
