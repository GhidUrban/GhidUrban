export function getImageByCategory(category: string) {
    switch (category) {
        case "restaurante":
            return "/images/restaurant.jpg";
        case "cafenele":
            return "/images/cafe.jpg";
        case "cultural":
            return "/images/cultural.jpg";
        case "institutii":
            return "/images/institutii.jpg";
        case "evenimente":
            return "/images/evenimente.jpg";
        case "natura":
            return "/images/natura.jpg";
        default:
            return "/images/place-placeholder.jpg";
    }
}
