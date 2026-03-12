export type Place = {
    id: string;
    name: string;
    image: string,
    address: string;
    rating: number;
    description: string;

    schedule?: string;
    phone?: string;
    website?: string;
    mapsUrl?: string;
};

export const placesByCity = {
    "baia-mare": {
        restaurante: [
            {
                id: "la-tour",
                name: "La Tour",
                image: "/images/place-placeholder.jpg",
                address: "Strada Victoriei 10",
                rating: 4.6,
                description: "Restaurant elegant, potrivit pentru prânz sau cină.",
                schedule: "10:00 - 22:00",
                phone: "0740 123 456",
                website: "https://latour.ro",
                mapsUrl: "https://maps.google.com/?q=La+Tour+Baia+Mare"

            },
            {
                id: "pressco",
                name: "Pressco",
                image: "/images/place-placeholder.jpg",
                address: "Bulevardul Unirii 5",
                rating: 4.4,
                description: "Loc bun pentru o masă rapidă și o cafea.",
                schedule: "08:00 - 20:00",
                phone: "0740 123 456",
                website: "https://pressco.ro",
                mapsUrl: "https://maps.google.com/?q=Pressco+Baia+Mare"
            },
            {
                id: "millennium",
                name: "Millennium",
                image: "/images/place-placeholder.jpg",
                address: "Centru Vechi",
                rating: 4.3,
                description: "Restaurant cunoscut, cu atmosferă plăcută.",
                schedule: "10:00 - 22:00",
                phone: "0740 123 456",
                website: "https://millennium.ro",
                mapsUrl: "https://maps.google.com/?q=Millennium+Baia+Mare"
            },
        ],
        cafenele: [
            {
                id: "narcoffee",
                name: "Narcoffee",
                image: "/images/place-placeholder.jpg",
                address: "Bd. București 12",
                rating: 4.5,
                description: "Cafea bună și spațiu plăcut pentru relaxare.",
                schedule: "08:00 - 20:00",
                phone: "0740 123 456",
                website: "https://narcoffee.ro",
                mapsUrl: "https://maps.google.com/?q=Narcoffee+Baia+Mare"
            },
        ],
        institutii: [
            {
                id: "primaria-baia-mare",
                name: "Primăria Baia Mare",
                image: "/images/place-placeholder.jpg",
                address: "Strada Gheorghe Șincai 37",
                rating: 4.0,
                description: "Instituție publică importantă a orașului.",
                schedule: "08:00 - 20:00",
                phone: "0740 123 456",
                website: "https://primaria-baia-mare.ro",
                mapsUrl: "https://maps.google.com/?q=Primaria+Baia+Mare"
            },
        ],
        cultural: [
            {
                id: "teatrul-municipal",
                name: "Teatrul Municipal",
                image: "/images/place-placeholder.jpg",
                address: "Strada Crișan 18",
                rating: 4.7,
                description: "Piese de teatru și evenimente culturale.",
                schedule: "08:00 - 20:00",
                phone: "0740 123 456",
                website: "https://teatrul-municipal.ro",
                mapsUrl: "https://maps.google.com/?q=Teatrul+Municipal+Baia+Mare"
            },
        ],
        evenimente: [
            {
                id: "festival-local",
                name: "Festival Local",
                image: "/images/place-placeholder.jpg",
                address: "Piața Centrală",
                rating: 4.8,
                description: "Eveniment sezonier cu muzică și activități.",
                schedule: "08:00 - 20:00",
                phone: "0740 123 456",
                website: "https://festival-local.ro",
                mapsUrl: "https://maps.google.com/?q=Festival+Local+Baia+Mare"
            },
        ],
    },
} as const;