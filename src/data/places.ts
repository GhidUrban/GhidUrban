export type Place = {
    id: string;
    name: string;
    image: string;
    address: string;
    rating: number;
    description: string;
    schedule: string;
    phone: string;
    website: string;
    mapsUrl: string;
};

const IMAGE_PLACEHOLDER = "/images/place-placeholder.jpg";

function makePlace(
    id: string,
    name: string,
    address: string,
    rating: number,
    description: string,
    schedule: string,
    phone: string,
    website: string,
    mapsUrl: string
): Place {
    return {
        id,
        name,
        image: IMAGE_PLACEHOLDER,
        address,
        rating,
        description,
        schedule,
        phone,
        website,
        mapsUrl,
    };
}

export type CitySlug =
    | "baia-mare"
    | "cluj-napoca"
    | "bucuresti"
    | "oradea"
    | "timisoara"
    | "brasov";

export type CategorySlug =
    | "restaurante"
    | "cafenele"
    | "institutii"
    | "cultural"
    | "natura"
    | "evenimente";

export type PlacesByCity = Record<CitySlug, Record<CategorySlug, Place[]>>;

export const placesByCity: PlacesByCity = {
    "baia-mare": {
        restaurante: [
            makePlace("la-tour", "La Tour", "Strada Victoriei 10, Baia Mare", 4.6, "Restaurant elegant, bun pentru cină și ocazii speciale.", "10:00 - 22:00", "0740 123 456", "https://latour.ro", "https://maps.google.com/?q=La+Tour+Baia+Mare"),
            makePlace("pressco-restaurant", "Pressco", "Bulevardul Regele Mihai I 2, Baia Mare", 4.4, "Meniu variat și servire rapidă, potrivit pentru prânz.", "07:30 - 17:00", "0751 900 926", "https://pressco.ro", "https://maps.google.com/?q=Pressco+Baia+Mare"),
            makePlace("millennium", "Millennium", "Centru Vechi, Baia Mare", 4.3, "Restaurant cunoscut local, cu atmosferă relaxată.", "10:00 - 22:00", "0745 345 678", "https://millennium.ro", "https://maps.google.com/?q=Millennium+Baia+Mare"),
            makePlace("lulivo", "L'ulivo", "Bulevardul București, Baia Mare", 4.6, "Specific italian, apreciat pentru paste și pizza.", "12:00 - 23:00", "0742 211 221", "https://www.facebook.com/lulivobaiamare", "https://maps.google.com/?q=L%27ulivo+Baia+Mare"),
            makePlace("budapesta", "Restaurant Budapesta", "Strada Vasile Alecsandri, Baia Mare", 4.5, "Preparatele tradiționale și porțiile mari îl fac foarte popular.", "10:00 - 22:00", "0262 214 444", "https://www.facebook.com/restaurantbudapestabm", "https://maps.google.com/?q=Restaurant+Budapesta+Baia+Mare"),
        ],
        cafenele: [
            makePlace("rox-specialty", "Rox - Specialty Coffee", "Strada Culturii 9, Baia Mare", 4.9, "Cafea de specialitate și atmosferă modernă, foarte bine evaluată.", "L-V 07:00 - 18:00, S-D 08:00 - 16:00", "0772 057 313", "https://europeancoffeetrip.com/cafe/roxspecialtycoffee-baiamare/", "https://maps.google.com/?q=Rox+Specialty+Coffee+Baia+Mare"),
            makePlace("code-coffee", "Code Coffee Shop & Roastery", "Strada Progresului 58-60, Baia Mare", 4.8, "Spațiu friendly pentru cafea bună, lucru și întâlniri.", "L-V 07:30 - 19:30, S-D 08:30 - 18:00", "0752 210 315", "https://europeancoffeetrip.com/cafe/codecoffeeshop-baiamare/", "https://maps.google.com/?q=Code+Coffee+Shop+Baia+Mare"),
            makePlace("narcoffee", "Narcoffee Roasters", "Bd. București 12, Baia Mare", 4.5, "Loc apreciat pentru cafea bună și atmosferă calmă.", "08:00 - 20:00", "0740 123 457", "https://narcoffee.ro", "https://maps.google.com/?q=Narcoffee+Baia+Mare"),
            makePlace("pressco-cafe", "Pressco Cafe", "Bulevardul Regele Mihai I 2, Baia Mare", 4.7, "Cafenea centrală potrivită pentru mic dejun și coffee break.", "07:30 - 17:00", "0751 900 926", "https://pressco.ro", "https://maps.google.com/?q=Pressco+Cafe+Baia+Mare"),
            makePlace("log-out", "Log Out", "Centru, Baia Mare", 4.6, "Cafenea casual, bună pentru socializare.", "09:00 - 22:00", "0741 124 555", "https://www.facebook.com/logoutbaiamare", "https://maps.google.com/?q=Log+Out+Baia+Mare"),
        ],
        institutii: [
            makePlace("primaria-baia-mare", "Primăria Baia Mare", "Strada Gheorghe Șincai 37, Baia Mare", 4.0, "Instituția principală de administrație locală.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Primaria+Baia+Mare"),
            makePlace("judecatoria-baia-mare", "Judecătoria Baia Mare", "Bd. Republicii 2A, Baia Mare", 4.4, "Instanță locală cu servicii de registratură și arhivă.", "L-V 08:00 - 12:00", "0262 218 235", "https://portal.just.ro/182/", "https://maps.google.com/?q=Judecatoria+Baia+Mare"),
            makePlace("consiliul-judetean-maramures", "Consiliul Județean Maramureș", "Strada Gheorghe Șincai 46, Baia Mare", 4.3, "Instituție administrativă județeană.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0262 212 110", "https://www.cjmaramures.ro", "https://maps.google.com/?q=Consiliul+Judetean+Maramures+Baia+Mare"),
            makePlace("ditl-baia-mare", "Direcția Impozite și Taxe Locale", "Strada Crișan 2, Baia Mare", 4.2, "Plăți, taxe locale și informații pentru contribuabili.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Directia+Impozite+Taxe+Baia+Mare"),
            makePlace("spitalul-judetean-baia-mare", "Spitalul Județean de Urgență", "Strada George Coșbuc 31, Baia Mare", 4.1, "Spitalul principal al orașului cu servicii de urgență.", "Non-stop (UPU)", "0262 205 100", "https://www.spitaljbm.ro", "https://maps.google.com/?q=Spitalul+Judetean+Baia+Mare"),
        ],
        cultural: [
            makePlace("teatrul-municipal-bm", "Teatrul Municipal Baia Mare", "Strada Crișan 8, Baia Mare", 4.7, "Instituție culturală cu spectacole de teatru și festivaluri.", "Program în funcție de spectacole", "0262 211 124", "http://teatrulbm.ro", "https://maps.google.com/?q=Teatrul+Municipal+Baia+Mare"),
            makePlace("muzeul-arta-bm", "Muzeul de Artă Baia Mare", "Strada 1 Mai 8, Baia Mare", 4.7, "Muzeu important pentru arta locală și contemporană.", "Ma-D 10:00 - 17:00", "0262 213 964", "https://muzartbm.ro", "https://maps.google.com/?q=Muzeul+de+Arta+Baia+Mare"),
            makePlace("muzeul-satului-bm", "Muzeul Satului Baia Mare", "Strada Dealul Florilor 1, Baia Mare", 4.7, "Muzeu etnografic în aer liber cu arhitectură tradițională.", "10:00 - 18:00", "0262 276 895", "https://muzeummm.ro", "https://maps.google.com/?q=Muzeul+Satului+Baia+Mare"),
            makePlace("colonia-pictorilor-bm", "Colonia Pictorilor", "Strada Victoriei 21, Baia Mare", 4.6, "Spațiu dedicat expozițiilor și atelierelor artistice.", "10:00 - 18:00", "0262 213 321", "https://www.facebook.com/coloniapictorilor", "https://maps.google.com/?q=Colonia+Pictorilor+Baia+Mare"),
            makePlace("bastionul-macelarilor-bm", "Bastionul Măcelarilor", "Centru Vechi, Baia Mare", 4.5, "Obiectiv istoric folosit și pentru evenimente culturale.", "10:00 - 19:00", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Bastionul+Macelarilor+Baia+Mare"),
        ],
        evenimente: [
            makePlace("festivalul-castanelor-bm", "Festivalul Castanelor", "Zona centrală, Baia Mare", 4.7, "Festival local foarte popular cu concerte și activități publice.", "Sezonier", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Festivalul+Castanelor+Baia+Mare"),
            makePlace("sala-lascar-pana-bm", "Sala Sporturilor Lascăr Pană", "Bd. Unirii 14A, Baia Mare", 4.6, "Arenă pentru sport și evenimente indoor.", "Program variabil", "0262 221 221", "https://csnlascarpana.ro", "https://maps.google.com/?q=Sala+Sporturilor+Lascar+Pana+Baia+Mare"),
            makePlace("teatrul-evenimente-bm", "Teatrul Municipal (Evenimente)", "Strada Crișan 8, Baia Mare", 4.7, "Premiere, spectacole și evenimente culturale recurente.", "Program variabil", "0262 211 124", "http://teatrulbm.ro", "https://maps.google.com/?q=Teatrul+Municipal+Baia+Mare"),
            makePlace("piata-libertatii-bm", "Piața Libertății", "Centrul Vechi, Baia Mare", 4.5, "Piață centrală pentru târguri și activări urbane.", "Program variabil", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Piata+Libertatii+Baia+Mare"),
            makePlace("colonie-events-bm", "Colonia Pictorilor (Events)", "Strada Victoriei 21, Baia Mare", 4.6, "Vernisaje, ateliere și evenimente creative.", "Program variabil", "0262 213 321", "https://www.facebook.com/coloniapictorilor", "https://maps.google.com/?q=Colonia+Pictorilor+Baia+Mare"),
        ],
        natura: [],
    },
    "cluj-napoca": {
        restaurante: [
            makePlace("baracca-cluj", "Baracca", "Strada Napoca 8A, Cluj-Napoca", 4.8, "Fine dining foarte apreciat pentru plating și servicii.", "12:00 - 23:00", "0364 730 615", "https://baracca.ro", "https://maps.google.com/?q=Baracca+Cluj"),
            makePlace("roata-cluj", "Roata", "Strada Alexandru Ciurea 6, Cluj-Napoca", 4.7, "Mâncare tradițională românească, populară printre turiști.", "10:00 - 23:00", "0264 592 022", "https://www.facebook.com/roatacluj", "https://maps.google.com/?q=Roata+Cluj"),
            makePlace("samsara-foodhouse", "Samsara Foodhouse", "Strada Cardinal Iuliu Hossu 3, Cluj-Napoca", 4.6, "Restaurant vegetarian cu atmosferă elegantă.", "12:00 - 22:00", "0364 730 746", "https://samsara.ro", "https://maps.google.com/?q=Samsara+Foodhouse+Cluj"),
            makePlace("marty-cluj", "Marty Plaza", "Strada Regele Ferdinand 22-26, Cluj-Napoca", 4.5, "Restaurant central, meniu variat și servire rapidă.", "09:00 - 00:00", "0364 401 677", "https://martyrestaurants.ro", "https://maps.google.com/?q=Marty+Cluj"),
            makePlace("via-cluj", "Via Restaurant", "Strada Inocențiu Micu Klein 6, Cluj-Napoca", 4.6, "Restaurant premium, ideal pentru cine speciale.", "12:00 - 23:00", "0364 730 780", "https://viarestaurant.ro", "https://maps.google.com/?q=Via+Restaurant+Cluj"),
        ],
        cafenele: [
            makePlace("meron-central", "Meron", "Bd. Eroilor 5, Cluj-Napoca", 4.7, "Cafenea specializată în coffee specialty și brunch.", "08:00 - 20:00", "0740 203 300", "https://meron.coffee", "https://maps.google.com/?q=Meron+Cluj"),
            makePlace("narcoffee-cluj", "Narcoffee Roasters", "Strada Napoca 8A, Cluj-Napoca", 4.6, "Cafea de specialitate cu spațiu modern.", "08:00 - 20:00", "0753 128 128", "https://narcoffee.ro", "https://maps.google.com/?q=Narcoffee+Cluj"),
            makePlace("yume-cluj", "Yume Coffee Roasters", "Strada Samuil Micu 16, Cluj-Napoca", 4.8, "Loc cunoscut pentru cafea filtrată și espresso excelent.", "08:00 - 19:00", "0749 280 321", "https://www.instagram.com/yumecoffeeroasters", "https://maps.google.com/?q=Yume+Coffee+Cluj"),
            makePlace("olivo-cluj", "Olivo Coffee Culture", "Bd. Eroilor 7, Cluj-Napoca", 4.6, "Cafea bună și locație centrală, foarte populară.", "08:00 - 22:00", "0264 590 705", "https://olivo.ro", "https://maps.google.com/?q=Olivo+Cluj"),
            makePlace("lets-coffee-cluj", "Let's Coffee", "Strada Memorandumului 3, Cluj-Napoca", 4.5, "Cafenea urbană, potrivită pentru întâlniri rapide.", "08:00 - 19:00", "0743 122 500", "https://www.facebook.com/letscoffeecluj", "https://maps.google.com/?q=Lets+Coffee+Cluj"),
        ],
        institutii: [
            makePlace("primaria-cluj", "Primăria Cluj-Napoca", "Calea Moților 3, Cluj-Napoca", 4.3, "Administrația locală a municipiului Cluj-Napoca.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0264 596 030", "https://primariaclujnapoca.ro", "https://maps.google.com/?q=Primaria+Cluj-Napoca"),
            makePlace("prefectura-cluj", "Instituția Prefectului Cluj", "Bd. 21 Decembrie 1989 58, Cluj-Napoca", 4.2, "Instituție publică pentru servicii administrative județene.", "L-V 08:30 - 16:30", "0264 503 300", "https://cj.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Cluj"),
            makePlace("consiliul-judetean-cluj", "Consiliul Județean Cluj", "Calea Dorobanților 106, Cluj-Napoca", 4.2, "Coordonează proiecte și servicii la nivel de județ.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0264 431 550", "https://cjcluj.ro", "https://maps.google.com/?q=Consiliul+Judetean+Cluj"),
            makePlace("spitalul-judetean-cluj", "Spitalul Clinic Județean Cluj", "Strada Clinicilor 3-5, Cluj-Napoca", 4.2, "Unitate medicală majoră cu multiple specializări.", "Non-stop (UPU)", "0264 597 852", "https://scjucluj.ro", "https://maps.google.com/?q=Spitalul+Clinic+Judetean+Cluj"),
            makePlace("directia-taxe-cluj", "Direcția Taxe și Impozite Cluj-Napoca", "Piața Unirii 1, Cluj-Napoca", 4.1, "Plăți taxe locale și relații cu contribuabilii.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0264 596 030", "https://primariaclujnapoca.ro", "https://maps.google.com/?q=Taxe+si+Impozite+Cluj"),
        ],
        cultural: [
            makePlace("teatrul-national-cluj", "Teatrul Național Cluj-Napoca", "Piața Ștefan cel Mare 2-4, Cluj-Napoca", 4.8, "Teatru emblematic cu repertoriu divers și producții mari.", "Program spectacole", "0264 592 771", "https://www.teatrulnationalcluj.ro", "https://maps.google.com/?q=Teatrul+National+Cluj"),
            makePlace("opera-romana-cluj", "Opera Națională Română Cluj", "Piața Ștefan cel Mare 2-4, Cluj-Napoca", 4.8, "Operă și balet în una dintre cele mai active instituții din țară.", "Program spectacole", "0264 595 366", "https://www.operacluj.ro", "https://maps.google.com/?q=Opera+Romana+Cluj"),
            makePlace("muzeul-arta-cluj", "Muzeul de Artă Cluj-Napoca", "Piața Unirii 30, Cluj-Napoca", 4.7, "Colecții de artă românească și europeană.", "Ma-D 10:00 - 17:00", "0264 596 952", "https://www.macluj.ro", "https://maps.google.com/?q=Muzeul+de+Arta+Cluj"),
            makePlace("muzeul-etnografic-cluj", "Muzeul Etnografic al Transilvaniei", "Strada Memorandumului 21, Cluj-Napoca", 4.7, "Patrimoniu etnografic bogat al regiunii.", "Ma-D 10:00 - 18:00", "0264 597 489", "https://www.muzeul-etnografic.ro", "https://maps.google.com/?q=Muzeul+Etnografic+Cluj"),
            makePlace("filarmonica-cluj", "Filarmonica de Stat Transilvania", "Strada Emil Isac 19, Cluj-Napoca", 4.8, "Concerte simfonice și evenimente muzicale premium.", "Program concerte", "0264 430 060", "https://filarmonica-transilvania.ro", "https://maps.google.com/?q=Filarmonica+Cluj"),
        ],
        evenimente: [
            makePlace("bt-arena-cluj", "BT Arena", "Aleea Stadionului 4, Cluj-Napoca", 4.7, "Arenă majoră pentru concerte și competiții sportive.", "Program variabil", "0264 483 160", "https://btarena.ro", "https://maps.google.com/?q=BT+Arena+Cluj"),
            makePlace("cluj-arena", "Cluj Arena", "Strada Stadionului 2, Cluj-Napoca", 4.6, "Stadion modern pentru meciuri și evenimente mari.", "Program variabil", "0264 450 654", "https://clujarena.ro", "https://maps.google.com/?q=Cluj+Arena"),
            makePlace("electric-castle", "Electric Castle", "Bonțida, Cluj", 4.7, "Festival internațional de muzică, foarte bine cotat.", "Sezonier", "0364 730 000", "https://electriccastle.ro", "https://maps.google.com/?q=Electric+Castle"),
            makePlace("untold-festival", "UNTOLD Festival", "Cluj Arena, Cluj-Napoca", 4.8, "Unul dintre cele mai mari festivaluri de muzică din Europa.", "Sezonier", "0731 000 000", "https://untold.com", "https://maps.google.com/?q=UNTOLD+Festival+Cluj"),
            makePlace("piata-unirii-events-cluj", "Piața Unirii (Evenimente)", "Piața Unirii, Cluj-Napoca", 4.6, "Piață centrală folosită pentru târguri și evenimente urbane.", "Program variabil", "0264 596 030", "https://primariaclujnapoca.ro", "https://maps.google.com/?q=Piata+Unirii+Cluj"),
        ],
        natura: [],
    },
    "bucuresti": {
        restaurante: [
            makePlace("caru-cu-bere", "Caru' cu Bere", "Strada Stavropoleos 5, București", 4.6, "Restaurant istoric, foarte apreciat pentru atmosferă și meniu tradițional.", "08:00 - 00:00", "0734 560 000", "https://www.carucubere.ro", "https://maps.google.com/?q=Caru+cu+Bere+Bucuresti"),
            makePlace("hanu-lui-manuc", "Hanul lui Manuc", "Strada Franceză 62-64, București", 4.6, "Loc emblematic cu bucătărie românească și terasă mare.", "10:00 - 00:00", "021 335 9275", "https://www.hanulluimanuc.ro", "https://maps.google.com/?q=Hanul+lui+Manuc"),
            makePlace("kaiamo", "KAIAMO", "Strada Ermil Pangratti 30A, București", 4.8, "Fine dining contemporan, bine cotat în ghiduri locale.", "17:00 - 23:00", "0723 138 111", "https://kaiamo.ro", "https://maps.google.com/?q=KAIAMO+Bucuresti"),
            makePlace("soro-lume", "Soro Lume", "Strada Fluierului 10, București", 4.7, "Meniu creativ reinterpretat din bucătăria românească.", "12:30 - 23:00", "0740 091 239", "https://sorolume.ro", "https://maps.google.com/?q=Soro+Lume+Bucuresti"),
            makePlace("lacrimi-si-sfinti", "Lacrimi și Sfinți", "Strada Șepcari 16, București", 4.6, "Restaurant cu specific românesc și design autentic.", "12:00 - 23:30", "0741 222 233", "https://www.facebook.com/lacrimisisfinti", "https://maps.google.com/?q=Lacrimi+si+Sfinti+Bucuresti"),
        ],
        cafenele: [
            makePlace("origo", "Origo Coffee", "Strada Lipscani 9, București", 4.7, "Una dintre cele mai apreciate cafenele specialty din oraș.", "08:00 - 20:00", "0766 555 988", "https://www.facebook.com/origocoffee", "https://maps.google.com/?q=Origo+Coffee+Bucuresti"),
            makePlace("sloane", "Sloane Coffee", "Strada C.A. Rosetti 17, București", 4.7, "Cafea de specialitate și atmosferă premium.", "08:00 - 20:00", "0737 001 122", "https://sloane.coffee", "https://maps.google.com/?q=Sloane+Coffee+Bucuresti"),
            makePlace("m60", "M60", "Strada D.I. Mendeleev 2, București", 4.6, "Cafea bună, brunch și spațiu modern.", "08:00 - 22:00", "0741 778 838", "https://www.facebook.com/m60cafe", "https://maps.google.com/?q=M60+Bucuresti"),
            makePlace("frudisiac", "Frudisiac", "Strada Vasile Lascăr 48-50, București", 4.6, "Brunch & coffee spot foarte popular în centru.", "08:00 - 18:00", "0730 009 886", "https://frudisiac.com", "https://maps.google.com/?q=Frudisiac+Bucuresti"),
            makePlace("bob-coffee-lab", "BOB Coffee Lab", "Strada Episcopiei 6, București", 4.7, "Specialty coffee și produse artizanale.", "08:00 - 19:00", "0724 430 111", "https://www.facebook.com/bobcoffeelab", "https://maps.google.com/?q=BOB+Coffee+Lab+Bucuresti"),
        ],
        institutii: [
            makePlace("primaria-capitalei", "Primăria Municipiului București", "Bd. Regina Elisabeta 47, București", 4.1, "Instituția administrativă centrală a capitalei.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "021 305 5500", "https://www.pmb.ro", "https://maps.google.com/?q=Primaria+Capitalei"),
            makePlace("prefectura-bucuresti", "Prefectura Municipiului București", "Bd. Regina Elisabeta 47, București", 4.1, "Servicii administrative și coordonare instituțională.", "L-V 08:30 - 16:30", "021 315 6565", "https://b.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Bucuresti"),
            makePlace("anaf-bucuresti", "ANAF - DGRFP București", "Strada Lucrețiu Pătrășcanu 10, București", 4.0, "Servicii fiscale pentru persoane fizice și juridice.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "021 408 9150", "https://www.anaf.ro", "https://maps.google.com/?q=ANAF+Bucuresti"),
            makePlace("spitalul-universitar", "Spitalul Universitar de Urgență", "Splaiul Independenței 169, București", 4.2, "Spital universitar major cu servicii de urgență.", "Non-stop (UPU)", "021 318 0500", "https://www.suub.ro", "https://maps.google.com/?q=Spitalul+Universitar+Bucuresti"),
            makePlace("directia-taxe-bucuresti", "Direcția Impozite și Taxe Locale Sector 1", "Strada Grigore Alexandrescu 4, București", 4.0, "Plăți și administrare taxe locale.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "021 314 9090", "https://www.impozitelocale1.ro", "https://maps.google.com/?q=DITL+Sector+1+Bucuresti"),
        ],
        cultural: [
            makePlace("teatrul-national-bucuresti", "Teatrul Național I.L. Caragiale", "Bd. Nicolae Bălcescu 2, București", 4.8, "Teatru de referință cu producții importante.", "Program spectacole", "021 314 7171", "https://www.tnb.ro", "https://maps.google.com/?q=Teatrul+National+Bucuresti"),
            makePlace("atheneul-roman", "Ateneul Român", "Strada Benjamin Franklin 1-3, București", 4.8, "Clădire emblematică și sală de concerte a Filarmonicii.", "Program concerte", "021 315 6875", "https://www.fge.org.ro", "https://maps.google.com/?q=Ateneul+Roman"),
            makePlace("mnar", "Muzeul Național de Artă al României", "Calea Victoriei 49-53, București", 4.7, "Colecții naționale de artă veche și modernă.", "Ma-D 11:00 - 19:00", "021 314 8119", "https://www.mnar.arts.ro", "https://maps.google.com/?q=MNAR+Bucuresti"),
            makePlace("muzeul-satului", "Muzeul Național al Satului Dimitrie Gusti", "Șoseaua Kiseleff 28-30, București", 4.8, "Muzeu în aer liber cu patrimoniu etnografic românesc.", "09:00 - 19:00", "021 317 9103", "https://muzeul-satului.ro", "https://maps.google.com/?q=Muzeul+Satului+Bucuresti"),
            makePlace("opera-nationala-bucuresti", "Opera Națională București", "Bd. Mihail Kogălniceanu 70-72, București", 4.7, "Spectacole de operă și balet cu distribuții de top.", "Program spectacole", "021 314 6980", "https://operanb.ro", "https://maps.google.com/?q=Opera+Nationala+Bucuresti"),
        ],
        evenimente: [
            makePlace("arena-nationala", "Arena Națională", "Bd. Basarabia 37-39, București", 4.6, "Stadion mare pentru meciuri și concerte.", "Program variabil", "021 318 5200", "https://www.arenanationala.ro", "https://maps.google.com/?q=Arena+Nationala"),
            makePlace("romexpo", "ROMEXPO", "Bd. Mărăști 65-67, București", 4.5, "Complex expozițional pentru târguri și conferințe.", "Program variabil", "021 207 7000", "https://romexpo.ro", "https://maps.google.com/?q=Romexpo+Bucuresti"),
            makePlace("sala-palatului", "Sala Palatului", "Strada Ion Câmpineanu 28, București", 4.6, "Evenimente mari, concerte și spectacole.", "Program variabil", "021 315 5310", "https://salapalatului.ro", "https://maps.google.com/?q=Sala+Palatului+Bucuresti"),
            makePlace("beraria-h", "Berăria H", "Șoseaua Kiseleff 32, București", 4.5, "Locație mare de concerte și evenimente live.", "Program variabil", "0725 345 345", "https://berariah.ro", "https://maps.google.com/?q=Beraria+H+Bucuresti"),
            makePlace("piata-constitutiei-events", "Piața Constituției (Evenimente)", "Piața Constituției, București", 4.6, "Spațiu urban pentru festivaluri, târguri și concerte.", "Program variabil", "021 305 5500", "https://www.pmb.ro", "https://maps.google.com/?q=Piata+Constitutiei+Bucuresti"),
        ],
        natura: [],
    },
    "oradea": {
        restaurante: [
            makePlace("ristorante-corsarul", "Ristorante Corsarul", "Calea Republicii 1, Oradea", 4.6, "Restaurant apreciat pentru preparate mediteraneene.", "11:00 - 23:00", "0756 789 100", "https://www.facebook.com/ristorantecorsarul", "https://maps.google.com/?q=Ristorante+Corsarul+Oradea"),
            makePlace("hanul-cu-noroc-oradea", "Hanul cu Noroc", "Strada Vasile Alecsandri 5, Oradea", 4.5, "Meniu românesc și atmosferă tradițională.", "10:00 - 23:00", "0752 338 800", "https://www.facebook.com/hanulcunorocoradea", "https://maps.google.com/?q=Hanul+cu+Noroc+Oradea"),
            makePlace("via29", "Via29", "Strada Aurel Lazăr 1, Oradea", 4.6, "Restaurant modern, cunoscut pentru plating și gust.", "12:00 - 23:00", "0733 555 229", "https://www.facebook.com/via29oradea", "https://maps.google.com/?q=Via29+Oradea"),
            makePlace("better-food", "Better Food", "Piața Unirii 2, Oradea", 4.5, "Restaurant casual cu opțiuni fresh și rapide.", "09:00 - 22:00", "0747 889 991", "https://www.facebook.com/betterfoodoradea", "https://maps.google.com/?q=Better+Food+Oradea"),
            makePlace("piata9", "Piata9", "Strada Primăriei 4, Oradea", 4.6, "Meniu urban, apreciat de localnici și turiști.", "09:00 - 23:00", "0770 309 009", "https://www.facebook.com/piata9oradea", "https://maps.google.com/?q=Piata9+Oradea"),
        ],
        cafenele: [
            makePlace("street-coffee-roasters", "Street Coffee Roasters", "Strada Republicii 15, Oradea", 4.7, "Cafea de specialitate și ambient relaxat.", "08:00 - 19:00", "0741 500 333", "https://www.facebook.com/streetcoffeeroasters", "https://maps.google.com/?q=Street+Coffee+Roasters+Oradea"),
            makePlace("rivo-cafe", "Rivo Cafe", "Piața Unirii 5, Oradea", 4.6, "Cafenea centrală, bună pentru întâlniri și lucru.", "08:00 - 22:00", "0259 430 700", "https://www.facebook.com/rivocafeoradea", "https://maps.google.com/?q=Rivo+Cafe+Oradea"),
            makePlace("meron-oradea", "Meron Oradea", "Strada Alecsandri 7, Oradea", 4.7, "Specialty coffee, setup modern și personal bun.", "08:00 - 20:00", "0731 101 201", "https://meron.coffee", "https://maps.google.com/?q=Meron+Oradea"),
            makePlace("dock-cafe", "Dock Specialty Coffee", "Strada Aurel Lazăr 3, Oradea", 4.6, "Cafea de origine și deserturi de casă.", "08:00 - 19:00", "0748 606 300", "https://www.facebook.com/dockspecialtycoffee", "https://maps.google.com/?q=Dock+Specialty+Coffee+Oradea"),
            makePlace("moszkva-cafe", "Moszkva Cafe", "Strada Republicii 11, Oradea", 4.5, "Cafenea cu design retro și meniu variat.", "09:00 - 22:00", "0743 212 889", "https://www.facebook.com/moszkvacafeoradea", "https://maps.google.com/?q=Moszkva+Cafe+Oradea"),
        ],
        institutii: [
            makePlace("primaria-oradea", "Primăria Oradea", "Piața Unirii 1, Oradea", 4.4, "Administrația locală a municipiului Oradea.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0259 437 000", "https://oradea.ro", "https://maps.google.com/?q=Primaria+Oradea"),
            makePlace("consiliul-judetean-bihor", "Consiliul Județean Bihor", "Parcul Traian 5, Oradea", 4.2, "Instituție administrativă la nivel de județ.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0259 403 200", "https://www.cjbihor.ro", "https://maps.google.com/?q=Consiliul+Judetean+Bihor"),
            makePlace("prefectura-bihor", "Prefectura Bihor", "Parcul Traian 5, Oradea", 4.1, "Instituția prefectului pentru servicii administrative.", "L-V 08:30 - 16:30", "0259 412 766", "https://bh.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Bihor"),
            makePlace("spitalul-judetean-oradea", "Spitalul Clinic Județean Oradea", "Strada Gheorghe Doja 65, Oradea", 4.2, "Spital județean cu servicii medicale complexe.", "Non-stop (UPU)", "0259 414 931", "https://www.spitaljudetean-oradea.ro", "https://maps.google.com/?q=Spitalul+Judetean+Oradea"),
            makePlace("taxe-impozite-oradea", "Direcția Taxe și Impozite Oradea", "Piața Unirii 1, Oradea", 4.1, "Servicii de taxe locale pentru cetățeni și firme.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0259 437 000", "https://oradea.ro", "https://maps.google.com/?q=Taxe+si+Impozite+Oradea"),
        ],
        cultural: [
            makePlace("teatrul-regina-maria", "Teatrul Regina Maria", "Piața Ferdinand 4-6, Oradea", 4.8, "Instituție de spectacol importantă în vestul țării.", "Program spectacole", "0259 440 742", "https://www.teatrulreginamaria.ro", "https://maps.google.com/?q=Teatrul+Regina+Maria+Oradea"),
            makePlace("filarmonica-oradea", "Filarmonica de Stat Oradea", "Strada Moscovei 5, Oradea", 4.7, "Concerte simfonice și evenimente muzicale.", "Program concerte", "0259 430 853", "https://www.filarmonicaoradea.ro", "https://maps.google.com/?q=Filarmonica+Oradea"),
            makePlace("muzeul-tarii-crisurilor", "Muzeul Țării Crișurilor", "Strada Armatei Române 1/A, Oradea", 4.7, "Muzeu complex cu secții de istorie, artă și științe.", "Ma-D 10:00 - 18:00", "0259 479 336", "https://muzeulcrisurilor.ro", "https://maps.google.com/?q=Muzeul+Tarii+Crisurilor+Oradea"),
            makePlace("casa-darvas", "Casa Darvas-La Roche", "Strada Iosif Vulcan 11, Oradea", 4.7, "Muzeu Art Nouveau foarte apreciat de turiști.", "Ma-D 10:00 - 18:00", "0770 197 287", "https://oradea.ro", "https://maps.google.com/?q=Casa+Darvas+La+Roche+Oradea"),
            makePlace("teatrul-szigligeti", "Teatrul Szigligeti", "Piața Ferdinand 4-6, Oradea", 4.6, "Teatru cu producții în limba maghiară și repertoriu variat.", "Program spectacole", "0259 440 742", "https://www.szigligeti.ro", "https://maps.google.com/?q=Teatrul+Szigligeti+Oradea"),
        ],
        evenimente: [
            makePlace("oradea-arena", "Oradea Arena", "Strada Traian Blajovici 24, Oradea", 4.7, "Arenă modernă pentru sport și evenimente mari.", "Program variabil", "0259 408 830", "https://www.csmoradea.ro", "https://maps.google.com/?q=Oradea+Arena"),
            makePlace("cetatea-oradea-events", "Cetatea Oradea (Evenimente)", "Strada Griviței 13, Oradea", 4.7, "Hub cultural cu festivaluri, târguri și expoziții.", "Program variabil", "0259 478 191", "https://www.cetateaoradea.ro", "https://maps.google.com/?q=Cetatea+Oradea"),
            makePlace("piata-unirii-oradea-events", "Piața Unirii (Evenimente)", "Piața Unirii, Oradea", 4.6, "Evenimente urbane sezoniere în centrul orașului.", "Program variabil", "0259 437 000", "https://oradea.ro", "https://maps.google.com/?q=Piata+Unirii+Oradea"),
            makePlace("teatrul-regina-maria-events", "Teatrul Regina Maria (Events)", "Piața Ferdinand 4-6, Oradea", 4.8, "Premiere și festivaluri de teatru pe parcursul anului.", "Program variabil", "0259 440 742", "https://www.teatrulreginamaria.ro", "https://maps.google.com/?q=Teatrul+Regina+Maria+Oradea"),
            makePlace("nufarul-festival", "Festivaluri Nufărul (zona centrală)", "Zona centrală, Oradea", 4.5, "Serii de evenimente locale cu muzică și activități stradale.", "Sezonier", "0259 437 000", "https://oradea.ro", "https://maps.google.com/?q=Evenimente+Oradea+Centru"),
        ],
        natura: [],
    },
    "timisoara": {
        restaurante: [
            makePlace("locanda-del-corso", "Locanda del Corso", "Strada Augustin Pacha 8, Timișoara", 4.7, "Restaurant italian foarte bine evaluat, atmosferă elegantă.", "12:00 - 23:00", "0753 077 777", "https://www.facebook.com/locandadelcorso", "https://maps.google.com/?q=Locanda+del+Corso+Timisoara"),
            makePlace("merlot-timisoara", "Merlot", "Strada Mărășești 1-3, Timișoara", 4.6, "Restaurant central, meniu premium și servicii bune.", "12:00 - 23:00", "0733 991 123", "https://www.facebook.com/merlottimisoara", "https://maps.google.com/?q=Merlot+Timisoara"),
            makePlace("little-hanoi", "Little Hanoi", "Strada Vasile Alecsandri 8, Timișoara", 4.7, "Restaurant asiatic apreciat pentru gust și consistență.", "12:00 - 22:30", "0722 263 030", "https://www.facebook.com/littlehanoitimisoara", "https://maps.google.com/?q=Little+Hanoi+Timisoara"),
            makePlace("homemade-timisoara", "Homemade", "Strada Eugeniu de Savoya 6, Timișoara", 4.6, "Loc popular pentru paste, burgeri și brunch.", "09:00 - 23:00", "0758 061 061", "https://www.homemade.ro", "https://maps.google.com/?q=Homemade+Timisoara"),
            makePlace("vinto", "Vinto Gastro Wine Bar", "Strada Eugeniu de Savoya 7, Timișoara", 4.7, "Meniu modern cu pairing de vinuri, apreciat local.", "12:00 - 00:00", "0744 673 838", "https://vinto.ro", "https://maps.google.com/?q=Vinto+Timisoara"),
        ],
        cafenele: [
            makePlace("ovride-specialty", "Ovride Specialty Coffee", "Piața Unirii 7, Timișoara", 4.8, "Cafea de specialitate și ambient minimalist.", "08:00 - 19:00", "0743 542 018", "https://www.instagram.com/ovridecoffee", "https://maps.google.com/?q=Ovride+Specialty+Coffee+Timisoara"),
            makePlace("doppio-timisoara", "Doppio", "Strada Mercy 9, Timișoara", 4.7, "Specialty coffee și vibe urban central.", "08:00 - 20:00", "0742 516 110", "https://www.facebook.com/doppiotimisoara", "https://maps.google.com/?q=Doppio+Timisoara"),
            makePlace("garage-cafe", "Garage Cafe", "Strada Florimund Mercy 4, Timișoara", 4.6, "Cafenea populară pentru întâlniri și lucru remote.", "08:00 - 22:00", "0756 329 003", "https://www.facebook.com/garagecafebar", "https://maps.google.com/?q=Garage+Cafe+Timisoara"),
            makePlace("staftim", "STAFTIM Coffee", "Strada Victor Vlad Delamarina 1, Timișoara", 4.6, "Cafea bună, servire rapidă și locație centrală.", "08:00 - 19:00", "0740 730 555", "https://www.facebook.com/staftim", "https://maps.google.com/?q=STAFTIM+Coffee+Timisoara"),
            makePlace("scartz-cafe", "Scârț Loc Lejer (Cafe)", "Strada Arh. Laszlo Szekely 1, Timișoara", 4.7, "Loc boem, preferat pentru cultură urbană și cafea.", "10:00 - 23:00", "0735 420 111", "https://www.facebook.com/scartloclejer", "https://maps.google.com/?q=Scart+Loc+Lejer+Timisoara"),
        ],
        institutii: [
            makePlace("primaria-timisoara", "Primăria Timișoara", "Bd. C.D. Loga 1, Timișoara", 4.3, "Administrația locală a municipiului Timișoara.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0256 408 300", "https://www.primariatm.ro", "https://maps.google.com/?q=Primaria+Timisoara"),
            makePlace("consiliul-judetean-timis", "Consiliul Județean Timiș", "Bd. Revoluției din 1989 17, Timișoara", 4.2, "Instituție administrativă județeană.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0256 406 300", "https://www.cjtimis.ro", "https://maps.google.com/?q=Consiliul+Judetean+Timis"),
            makePlace("prefectura-timis", "Prefectura Timiș", "Bd. Revoluției din 1989 17, Timișoara", 4.1, "Instituția prefectului pentru servicii administrative.", "L-V 08:30 - 16:30", "0256 490 626", "https://tm.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Timis"),
            makePlace("spitalul-judetean-timisoara", "Spitalul Clinic Județean Timișoara", "Bd. Liviu Rebreanu 156, Timișoara", 4.2, "Spital regional important cu secții multiple.", "Non-stop (UPU)", "0256 309 500", "https://www.hosptm.ro", "https://maps.google.com/?q=Spitalul+Judetean+Timisoara"),
            makePlace("taxe-impozite-timisoara", "Direcția Fiscală Timișoara", "Strada Aristide Demetriade 1, Timișoara", 4.0, "Gestionare taxe locale și relații cu contribuabili.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0256 408 979", "https://www.primariatm.ro", "https://maps.google.com/?q=Directia+Fiscala+Timisoara"),
        ],
        cultural: [
            makePlace("teatrul-national-timisoara", "Teatrul Național Timișoara", "Strada Mărășești 2, Timișoara", 4.8, "Teatru de referință cu producții apreciate.", "Program spectacole", "0256 201 117", "https://www.tntimisoara.com", "https://maps.google.com/?q=Teatrul+National+Timisoara"),
            makePlace("opera-romana-timisoara", "Opera Națională Română Timișoara", "Piața Victoriei 2, Timișoara", 4.8, "Operă și balet în inima orașului.", "Program spectacole", "0256 201 286", "https://www.ort.ro", "https://maps.google.com/?q=Opera+Timisoara"),
            makePlace("muzeul-national-al-banatului", "Muzeul Național al Banatului", "Castelul Huniade, Timișoara", 4.7, "Muzeu istoric important pentru regiunea Banat.", "Ma-D 10:00 - 18:00", "0256 201 321", "https://mnab.ro", "https://maps.google.com/?q=Muzeul+National+al+Banatului"),
            makePlace("muzeul-de-arta-timisoara", "Muzeul de Artă Timișoara", "Piața Unirii 1, Timișoara", 4.7, "Colecții de artă românească și europeană.", "Ma-D 10:00 - 18:00", "0256 491 592", "https://muzeuldeartatm.ro", "https://maps.google.com/?q=Muzeul+de+Arta+Timisoara"),
            makePlace("filarmonica-banatul", "Filarmonica Banatul", "Bd. C.D. Loga 2, Timișoara", 4.8, "Concerte simfonice și evenimente de muzică clasică.", "Program concerte", "0256 494 414", "https://filarmonicabanatul.ro", "https://maps.google.com/?q=Filarmonica+Banatul"),
        ],
        evenimente: [
            makePlace("sala-olympia", "Sala Olimpia", "Aleea F.C. Ripensia 7, Timișoara", 4.6, "Arenă pentru sport și evenimente publice.", "Program variabil", "0256 406 710", "https://www.primariatm.ro", "https://maps.google.com/?q=Sala+Olimpia+Timisoara"),
            makePlace("iulius-congress-hall", "Iulius Congress Hall", "Piața Consiliul Europei 2, Timișoara", 4.6, "Loc pentru conferințe și evenimente corporate.", "Program variabil", "0256 490 888", "https://iuliustown.ro", "https://maps.google.com/?q=Iulius+Congress+Hall+Timisoara"),
            makePlace("piata-victoriei-events-tm", "Piața Victoriei (Evenimente)", "Piața Victoriei, Timișoara", 4.7, "Concerte și evenimente urbane majore.", "Program variabil", "0256 408 300", "https://www.primariatm.ro", "https://maps.google.com/?q=Piata+Victoriei+Timisoara"),
            makePlace("teatrul-national-events-tm", "Teatrul Național (Evenimente)", "Strada Mărășești 2, Timișoara", 4.8, "Festivaluri și premiere teatrale pe tot anul.", "Program variabil", "0256 201 117", "https://www.tntimisoara.com", "https://maps.google.com/?q=Teatrul+National+Timisoara"),
            makePlace("flight-festival", "Flight Festival", "Muzeul Satului Bănățean, Timișoara", 4.6, "Festival de muzică și tehnologie, foarte popular vara.", "Sezonier", "0740 300 111", "https://flight-festival.com", "https://maps.google.com/?q=Flight+Festival+Timisoara"),
        ],
        natura: [],
    },
    "brasov": {
        restaurante: [
            makePlace("sub-tampa", "Sub Tâmpa", "Aleea Tiberiu Brediceanu 2, Brașov", 4.7, "Restaurant apreciat pentru priveliște și preparate locale.", "11:00 - 23:00", "0728 800 800", "https://subtampa.ro", "https://maps.google.com/?q=Sub+Tampa+Brasov"),
            makePlace("dei-frati", "Dei Frati", "Strada Diaconu Coresi 2, Brașov", 4.8, "Restaurant italian foarte bine evaluat de localnici.", "12:00 - 23:00", "0722 363 200", "https://www.facebook.com/deifratibv", "https://maps.google.com/?q=Dei+Frati+Brasov"),
            makePlace("sergiana", "Sergiana", "Strada Mureșenilor 28, Brașov", 4.6, "Meniu românesc tradițional, foarte popular.", "10:00 - 23:00", "0268 417 775", "https://sergianagrup.ro", "https://maps.google.com/?q=Sergiana+Brasov"),
            makePlace("la-ceaun", "La Ceaun", "Piața Sfatului 11, Brașov", 4.6, "Loc central pentru mâncare românească autentică.", "10:00 - 23:00", "0749 665 665", "https://www.facebook.com/laceaunbrasov", "https://maps.google.com/?q=La+Ceaun+Brasov"),
            makePlace("bistro-del-arte", "Bistro de l'Arte", "Piața Enescu George 11bis, Brașov", 4.7, "Bistro artistic cu atmosferă boemă și meniu creativ.", "09:00 - 23:00", "0268 475 475", "https://www.bistrodelarte.ro", "https://maps.google.com/?q=Bistro+de+l%27Arte+Brasov"),
        ],
        cafenele: [
            makePlace("croitoria-de-cafea", "Croitoria de Cafea", "Strada Michael Weiss 11, Brașov", 4.8, "Specialty coffee, local foarte apreciat în centru.", "08:00 - 20:00", "0742 099 331", "https://www.facebook.com/croitoriadecafea", "https://maps.google.com/?q=Croitoria+de+Cafea+Brasov"),
            makePlace("tipografia", "Tipografia", "Piața George Enescu 11, Brașov", 4.7, "Cafenea modernă, atmosferă bună pentru socializare.", "09:00 - 23:00", "0731 333 171", "https://www.facebook.com/tipografiabv", "https://maps.google.com/?q=Tipografia+Brasov"),
            makePlace("news-caffe", "News Caffe", "Piața Sfatului 24, Brașov", 4.6, "Cafenea centrală cu terasă în piață.", "08:00 - 23:00", "0268 472 211", "https://www.facebook.com/newscaffebrasov", "https://maps.google.com/?q=News+Caffe+Brasov"),
            makePlace("cafeneaua-de-acasa", "Cafeneaua de Acasă", "Strada Republicii 16, Brașov", 4.6, "Loc cozy, bun pentru cafea și desert.", "09:00 - 21:00", "0740 822 922", "https://www.facebook.com/cafeneauadeacasa", "https://maps.google.com/?q=Cafeneaua+de+Acasa+Brasov"),
            makePlace("book-coffee-shop", "Book Coffee Shop", "Strada Postăvarului 31, Brașov", 4.5, "Cafenea mică, liniștită, cu vibe relaxat.", "08:30 - 20:00", "0741 600 118", "https://www.facebook.com/bookcoffeeshopbv", "https://maps.google.com/?q=Book+Coffee+Shop+Brasov"),
        ],
        institutii: [
            makePlace("primaria-brasov", "Primăria Brașov", "Bd. Eroilor 8, Brașov", 4.3, "Administrația locală a municipiului Brașov.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0268 405 000", "https://www.brasovcity.ro", "https://maps.google.com/?q=Primaria+Brasov"),
            makePlace("consiliul-judetean-brasov", "Consiliul Județean Brașov", "Bd. Eroilor 5, Brașov", 4.2, "Instituție administrativă la nivel județean.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0268 410 777", "https://cjbrasov.ro", "https://maps.google.com/?q=Consiliul+Judetean+Brasov"),
            makePlace("prefectura-brasov", "Prefectura Brașov", "Bd. Eroilor 5, Brașov", 4.1, "Instituția prefectului pentru servicii administrative.", "L-V 08:30 - 16:30", "0268 410 210", "https://bv.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Brasov"),
            makePlace("spitalul-judetean-brasov", "Spitalul Clinic Județean Brașov", "Calea București 25-27, Brașov", 4.2, "Spital județean cu servicii medicale extinse.", "Non-stop (UPU)", "0268 320 022", "https://www.hospbv.ro", "https://maps.google.com/?q=Spitalul+Judetean+Brasov"),
            makePlace("taxe-impozite-brasov", "Direcția Fiscală Brașov", "Strada Dorobanților 4, Brașov", 4.0, "Taxe locale și servicii pentru contribuabili.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0268 416 550", "https://www.brasovcity.ro", "https://maps.google.com/?q=Directia+Fiscala+Brasov"),
        ],
        cultural: [
            makePlace("teatrul-sica-alexandrescu", "Teatrul Sică Alexandrescu", "Strada Mureșenilor 1, Brașov", 4.8, "Teatru important cu repertoriu variat.", "Program spectacole", "0268 418 850", "https://www.teatrulsicaalexandrescu.ro", "https://maps.google.com/?q=Teatrul+Sica+Alexandrescu+Brasov"),
            makePlace("opera-brasov", "Opera Brașov", "Strada Bisericii Române 51, Brașov", 4.8, "Spectacole de operă, operetă și balet.", "Program spectacole", "0268 419 380", "https://www.operabrasov.ro", "https://maps.google.com/?q=Opera+Brasov"),
            makePlace("muzeul-de-arta-brasov", "Muzeul de Artă Brașov", "Bd. Eroilor 21A, Brașov", 4.7, "Colecții valoroase de artă românească.", "Ma-D 10:00 - 18:00", "0268 477 286", "https://muzeuldeartabrasov.ro", "https://maps.google.com/?q=Muzeul+de+Arta+Brasov"),
            makePlace("prima-scoala-romaneasca", "Prima Școală Românească", "Piața Unirii 2-3, Brașov", 4.8, "Muzeu istoric foarte căutat de turiști.", "09:00 - 17:00", "0268 511 820", "https://www.primascoalabrasov.ro", "https://maps.google.com/?q=Prima+Scoala+Romaneasca+Brasov"),
            makePlace("centrul-cultural-reduta", "Centrul Cultural Reduta", "Strada Apollonia Hirscher 8, Brașov", 4.7, "Evenimente culturale și spectacole locale.", "Program evenimente", "0268 419 706", "https://centrulculturalreduta.ro", "https://maps.google.com/?q=Centrul+Cultural+Reduta+Brasov"),
        ],
        evenimente: [
            makePlace("piata-sfatului-events", "Piața Sfatului (Evenimente)", "Piața Sfatului, Brașov", 4.8, "Concerte, târguri și evenimente sezoniere în centru.", "Program variabil", "0268 405 000", "https://www.brasovcity.ro", "https://maps.google.com/?q=Piata+Sfatului+Brasov"),
            makePlace("parcul-nicolae-titulescu-events", "Parcul Nicolae Titulescu (Events)", "Bd. Eroilor, Brașov", 4.6, "Spațiu verde folosit pentru evenimente publice.", "Program variabil", "0268 405 000", "https://www.brasovcity.ro", "https://maps.google.com/?q=Parcul+Nicolae+Titulescu+Brasov"),
            makePlace("olympia-brasov-events", "Centrul Sportiv Olimpia", "Strada George Coșbuc 2, Brașov", 4.5, "Competiții sportive și activări locale.", "Program variabil", "0268 547 149", "https://www.olympiabrasov.ro", "https://maps.google.com/?q=Olimpia+Brasov"),
            makePlace("reduta-events", "Centrul Cultural Reduta (Events)", "Strada Apollonia Hirscher 8, Brașov", 4.7, "Festivaluri locale și evenimente culturale.", "Program variabil", "0268 419 706", "https://centrulculturalreduta.ro", "https://maps.google.com/?q=Reduta+Brasov"),
            makePlace("junii-brasovului", "Parada Junilor Brașovului", "Șcheii Brașovului", 4.8, "Eveniment tradițional emblematic pentru Brașov.", "Sezonier", "0268 472 050", "https://www.brasovtourism.app", "https://maps.google.com/?q=Junii+Brasovului"),
        ],
        natura: [],
    },
};

export function isCitySlug(slug: string): slug is CitySlug {
    return slug in placesByCity;
}

export function isCategorySlug(city: CitySlug, category: string): category is CategorySlug {
    return category in placesByCity[city];
}
/*
export type Place = {
    id: string;
    name: string;
    image: string;
    address: string;
    rating: number;
    description: string;
    schedule: string;
    phone: string;
    website: string;
    mapsUrl: string;
};

const IMAGE_PLACEHOLDER = "/images/place-placeholder.jpg";

function makePlace(
    id: string,
    name: string,
    address: string,
    rating: number,
    description: string,
    schedule: string,
    phone: string,
    website: string,
    mapsUrl: string
): Place {
    return {
        id,
        name,
        image: IMAGE_PLACEHOLDER,
        address,
        rating,
        description,
        schedule,
        phone,
        website,
        mapsUrl,
    };
}

export type CitySlug =
    | "baia-mare"
    | "cluj-napoca"
    | "bucuresti"
    | "oradea"
    | "timisoara"
    | "brasov";

export type CategorySlug =
    | "restaurante"
    | "cafenele"
    | "institutii"
    | "cultural"
    | "natura"
    | "evenimente";

export type PlacesByCity = Record<CitySlug, Record<CategorySlug, Place[]>>;

export const placesByCity: PlacesByCity = {
    "baia-mare": {
        restaurante: [
            makePlace("la-tour", "La Tour", "Strada Victoriei 10, Baia Mare", 4.6, "Restaurant elegant, bun pentru cină și ocazii speciale.", "10:00 - 22:00", "0740 123 456", "https://latour.ro", "https://maps.google.com/?q=La+Tour+Baia+Mare"),
            makePlace("pressco-restaurant", "Pressco", "Bulevardul Regele Mihai I 2, Baia Mare", 4.4, "Meniu variat și servire rapidă, potrivit pentru prânz.", "07:30 - 17:00", "0751 900 926", "https://pressco.ro", "https://maps.google.com/?q=Pressco+Baia+Mare"),
            makePlace("millennium", "Millennium", "Centru Vechi, Baia Mare", 4.3, "Restaurant cunoscut local, cu atmosferă relaxată.", "10:00 - 22:00", "0745 345 678", "https://millennium.ro", "https://maps.google.com/?q=Millennium+Baia+Mare"),
            makePlace("lulivo", "L'ulivo", "Bulevardul București, Baia Mare", 4.6, "Specific italian, apreciat pentru paste și pizza.", "12:00 - 23:00", "0742 211 221", "https://www.facebook.com/lulivobaiamare", "https://maps.google.com/?q=L%27ulivo+Baia+Mare"),
            makePlace("budapesta", "Restaurant Budapesta", "Strada Vasile Alecsandri, Baia Mare", 4.5, "Preparatele tradiționale și porțiile mari îl fac foarte popular.", "10:00 - 22:00", "0262 214 444", "https://www.facebook.com/restaurantbudapestabm", "https://maps.google.com/?q=Restaurant+Budapesta+Baia+Mare"),
        ],
        cafenele: [
            makePlace("rox-specialty", "Rox - Specialty Coffee", "Strada Culturii 9, Baia Mare", 4.9, "Cafea de specialitate și atmosferă modernă, foarte bine evaluată.", "L-V 07:00 - 18:00, S-D 08:00 - 16:00", "0772 057 313", "https://europeancoffeetrip.com/cafe/roxspecialtycoffee-baiamare/", "https://maps.google.com/?q=Rox+Specialty+Coffee+Baia+Mare"),
            makePlace("code-coffee", "Code Coffee Shop & Roastery", "Strada Progresului 58-60, Baia Mare", 4.8, "Spațiu friendly pentru cafea bună, lucru și întâlniri.", "L-V 07:30 - 19:30, S-D 08:30 - 18:00", "0752 210 315", "https://europeancoffeetrip.com/cafe/codecoffeeshop-baiamare/", "https://maps.google.com/?q=Code+Coffee+Shop+Baia+Mare"),
            makePlace("narcoffee", "Narcoffee Roasters", "Bd. București 12, Baia Mare", 4.5, "Loc apreciat pentru cafea bună și atmosferă calmă.", "08:00 - 20:00", "0740 123 457", "https://narcoffee.ro", "https://maps.google.com/?q=Narcoffee+Baia+Mare"),
            makePlace("pressco-cafe", "Pressco Cafe", "Bulevardul Regele Mihai I 2, Baia Mare", 4.7, "Cafenea centrală potrivită pentru mic dejun și coffee break.", "07:30 - 17:00", "0751 900 926", "https://pressco.ro", "https://maps.google.com/?q=Pressco+Cafe+Baia+Mare"),
            makePlace("log-out", "Log Out", "Centru, Baia Mare", 4.6, "Cafenea casual, bună pentru socializare.", "09:00 - 22:00", "0741 124 555", "https://www.facebook.com/logoutbaiamare", "https://maps.google.com/?q=Log+Out+Baia+Mare"),
        ],
        institutii: [
            makePlace("primaria-baia-mare", "Primăria Baia Mare", "Strada Gheorghe Șincai 37, Baia Mare", 4.0, "Instituția principală de administrație locală.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Primaria+Baia+Mare"),
            makePlace("judecatoria-baia-mare", "Judecătoria Baia Mare", "Bd. Republicii 2A, Baia Mare", 4.4, "Instanță locală cu servicii de registratură și arhivă.", "L-V 08:00 - 12:00", "0262 218 235", "https://portal.just.ro/182/", "https://maps.google.com/?q=Judecatoria+Baia+Mare"),
            makePlace("consiliul-judetean-maramures", "Consiliul Județean Maramureș", "Strada Gheorghe Șincai 46, Baia Mare", 4.3, "Instituție administrativă județeană.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0262 212 110", "https://www.cjmaramures.ro", "https://maps.google.com/?q=Consiliul+Judetean+Maramures+Baia+Mare"),
            makePlace("ditl-baia-mare", "Direcția Impozite și Taxe Locale", "Strada Crișan 2, Baia Mare", 4.2, "Plăți, taxe locale și informații pentru contribuabili.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Directia+Impozite+Taxe+Baia+Mare"),
            makePlace("spitalul-judetean-baia-mare", "Spitalul Județean de Urgență", "Strada George Coșbuc 31, Baia Mare", 4.1, "Spitalul principal al orașului cu servicii de urgență.", "Non-stop (UPU)", "0262 205 100", "https://www.spitaljbm.ro", "https://maps.google.com/?q=Spitalul+Judetean+Baia+Mare"),
        ],
        cultural: [
            makePlace("teatrul-municipal-bm", "Teatrul Municipal Baia Mare", "Strada Crișan 8, Baia Mare", 4.7, "Instituție culturală cu spectacole de teatru și festivaluri.", "Program în funcție de spectacole", "0262 211 124", "http://teatrulbm.ro", "https://maps.google.com/?q=Teatrul+Municipal+Baia+Mare"),
            makePlace("muzeul-arta-bm", "Muzeul de Artă Baia Mare", "Strada 1 Mai 8, Baia Mare", 4.7, "Muzeu important pentru arta locală și contemporană.", "Ma-D 10:00 - 17:00", "0262 213 964", "https://muzartbm.ro", "https://maps.google.com/?q=Muzeul+de+Arta+Baia+Mare"),
            makePlace("muzeul-satului-bm", "Muzeul Satului Baia Mare", "Strada Dealul Florilor 1, Baia Mare", 4.7, "Muzeu etnografic în aer liber cu arhitectură tradițională.", "10:00 - 18:00", "0262 276 895", "https://muzeummm.ro", "https://maps.google.com/?q=Muzeul+Satului+Baia+Mare"),
            makePlace("colonia-pictorilor-bm", "Colonia Pictorilor", "Strada Victoriei 21, Baia Mare", 4.6, "Spațiu dedicat expozițiilor și atelierelor artistice.", "10:00 - 18:00", "0262 213 321", "https://www.facebook.com/coloniapictorilor", "https://maps.google.com/?q=Colonia+Pictorilor+Baia+Mare"),
            makePlace("bastionul-macelarilor-bm", "Bastionul Măcelarilor", "Centru Vechi, Baia Mare", 4.5, "Obiectiv istoric folosit și pentru evenimente culturale.", "10:00 - 19:00", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Bastionul+Macelarilor+Baia+Mare"),
        ],
        evenimente: [
            makePlace("festivalul-castanelor-bm", "Festivalul Castanelor", "Zona centrală, Baia Mare", 4.7, "Festival local foarte popular cu concerte și activități publice.", "Sezonier", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Festivalul+Castanelor+Baia+Mare"),
            makePlace("sala-lascar-pana-bm", "Sala Sporturilor Lascăr Pană", "Bd. Unirii 14A, Baia Mare", 4.6, "Evenimente sportive, concerte și competiții indoor.", "Program variabil", "0262 221 221", "https://csnlascarpana.ro", "https://maps.google.com/?q=Sala+Sporturilor+Lascar+Pana+Baia+Mare"),
            makePlace("teatrul-evenimente-bm", "Teatrul Municipal (Evenimente)", "Strada Crișan 8, Baia Mare", 4.7, "Premiere, spectacole și evenimente culturale recurente.", "Program variabil", "0262 211 124", "http://teatrulbm.ro", "https://maps.google.com/?q=Teatrul+Municipal+Baia+Mare"),
            makePlace("piata-libertatii-bm", "Piața Libertății", "Centrul Vechi, Baia Mare", 4.5, "Piață centrală folosită pentru târguri și activări urbane.", "Program variabil", "0262 211 001", "https://www.baiamare.ro", "https://maps.google.com/?q=Piata+Libertatii+Baia+Mare"),
            makePlace("colonie-events-bm", "Colonia Pictorilor (Events)", "Strada Victoriei 21, Baia Mare", 4.6, "Vernisaje, ateliere și evenimente creative pentru public.", "Program variabil", "0262 213 321", "https://www.facebook.com/coloniapictorilor", "https://maps.google.com/?q=Colonia+Pictorilor+Baia+Mare"),
        ],
    },
    "cluj-napoca": {
        restaurante: [
            makePlace("baracca-cluj", "Baracca", "Strada Napoca 8A, Cluj-Napoca", 4.8, "Fine dining foarte apreciat pentru plating și servicii.", "12:00 - 23:00", "0364 730 615", "https://baracca.ro", "https://maps.google.com/?q=Baracca+Cluj"),
            makePlace("roata-cluj", "Roata", "Strada Alexandru Ciurea 6, Cluj-Napoca", 4.7, "Mâncare tradițională românească, populară printre turiști.", "10:00 - 23:00", "0264 592 022", "https://www.facebook.com/roatacluj", "https://maps.google.com/?q=Roata+Cluj"),
            makePlace("samsara-foodhouse", "Samsara Foodhouse", "Strada Cardinal Iuliu Hossu 3, Cluj-Napoca", 4.6, "Restaurant vegetarian cu atmosferă elegantă.", "12:00 - 22:00", "0364 730 746", "https://samsara.ro", "https://maps.google.com/?q=Samsara+Foodhouse+Cluj"),
            makePlace("marty-cluj", "Marty Plaza", "Strada Regele Ferdinand 22-26, Cluj-Napoca", 4.5, "Restaurant central, meniu variat și servire rapidă.", "09:00 - 00:00", "0364 401 677", "https://martyrestaurants.ro", "https://maps.google.com/?q=Marty+Cluj"),
            makePlace("via-cluj", "Via Restaurant", "Strada Inocențiu Micu Klein 6, Cluj-Napoca", 4.6, "Restaurant premium, ideal pentru cine speciale.", "12:00 - 23:00", "0364 730 780", "https://viarestaurant.ro", "https://maps.google.com/?q=Via+Restaurant+Cluj"),
        ],
        cafenele: [
            makePlace("meron-central", "Meron", "Bd. Eroilor 5, Cluj-Napoca", 4.7, "Cafenea specializată în coffee specialty și brunch.", "08:00 - 20:00", "0740 203 300", "https://meron.coffee", "https://maps.google.com/?q=Meron+Cluj"),
            makePlace("narcoffee-cluj", "Narcoffee Roasters", "Strada Napoca 8A, Cluj-Napoca", 4.6, "Cafea de specialitate cu spațiu modern.", "08:00 - 20:00", "0753 128 128", "https://narcoffee.ro", "https://maps.google.com/?q=Narcoffee+Cluj"),
            makePlace("yume-cluj", "Yume Coffee Roasters", "Strada Samuil Micu 16, Cluj-Napoca", 4.8, "Loc cunoscut pentru cafea filtrată și espresso excelent.", "08:00 - 19:00", "0749 280 321", "https://www.instagram.com/yumecoffeeroasters", "https://maps.google.com/?q=Yume+Coffee+Cluj"),
            makePlace("olivo-cluj", "Olivo Coffee Culture", "Bd. Eroilor 7, Cluj-Napoca", 4.6, "Cafea bună și locație centrală, foarte populară.", "08:00 - 22:00", "0264 590 705", "https://olivo.ro", "https://maps.google.com/?q=Olivo+Cluj"),
            makePlace("lets-coffee-cluj", "Let's Coffee", "Strada Memorandumului 3, Cluj-Napoca", 4.5, "Cafenea urbană, potrivită pentru întâlniri rapide.", "08:00 - 19:00", "0743 122 500", "https://www.facebook.com/letscoffeecluj", "https://maps.google.com/?q=Lets+Coffee+Cluj"),
        ],
        institutii: [
            makePlace("primaria-cluj", "Primăria Cluj-Napoca", "Calea Moților 3, Cluj-Napoca", 4.3, "Administrația locală a municipiului Cluj-Napoca.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0264 596 030", "https://primariaclujnapoca.ro", "https://maps.google.com/?q=Primaria+Cluj-Napoca"),
            makePlace("prefectura-cluj", "Instituția Prefectului Cluj", "Bd. 21 Decembrie 1989 58, Cluj-Napoca", 4.2, "Instituție publică pentru servicii administrative județene.", "L-V 08:30 - 16:30", "0264 503 300", "https://cj.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Cluj"),
            makePlace("consiliul-judetean-cluj", "Consiliul Județean Cluj", "Calea Dorobanților 106, Cluj-Napoca", 4.2, "Coordonează proiecte și servicii la nivel de județ.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0264 431 550", "https://cjcluj.ro", "https://maps.google.com/?q=Consiliul+Judetean+Cluj"),
            makePlace("spitalul-judetean-cluj", "Spitalul Clinic Județean Cluj", "Strada Clinicilor 3-5, Cluj-Napoca", 4.2, "Unitate medicală majoră cu multiple specializări.", "Non-stop (UPU)", "0264 597 852", "https://scjucluj.ro", "https://maps.google.com/?q=Spitalul+Clinic+Judetean+Cluj"),
            makePlace("directia-taxe-cluj", "Direcția Taxe și Impozite Cluj-Napoca", "Piața Unirii 1, Cluj-Napoca", 4.1, "Plăți taxe locale și relații cu contribuabilii.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0264 596 030", "https://primariaclujnapoca.ro", "https://maps.google.com/?q=Taxe+si+Impozite+Cluj"),
        ],
        cultural: [
            makePlace("teatrul-national-cluj", "Teatrul Național Cluj-Napoca", "Piața Ștefan cel Mare 2-4, Cluj-Napoca", 4.8, "Teatru emblematic cu repertoriu divers și producții mari.", "Program spectacole", "0264 592 771", "https://www.teatrulnationalcluj.ro", "https://maps.google.com/?q=Teatrul+National+Cluj"),
            makePlace("opera-romana-cluj", "Opera Națională Română Cluj", "Piața Ștefan cel Mare 2-4, Cluj-Napoca", 4.8, "Operă și balet în una dintre cele mai active instituții din țară.", "Program spectacole", "0264 595 366", "https://www.operacluj.ro", "https://maps.google.com/?q=Opera+Romana+Cluj"),
            makePlace("muzeul-arta-cluj", "Muzeul de Artă Cluj-Napoca", "Piața Unirii 30, Cluj-Napoca", 4.7, "Colecții de artă românească și europeană.", "Ma-D 10:00 - 17:00", "0264 596 952", "https://www.macluj.ro", "https://maps.google.com/?q=Muzeul+de+Arta+Cluj"),
            makePlace("muzeul-etnografic-cluj", "Muzeul Etnografic al Transilvaniei", "Strada Memorandumului 21, Cluj-Napoca", 4.7, "Patrimoniu etnografic bogat al regiunii.", "Ma-D 10:00 - 18:00", "0264 597 489", "https://www.muzeul-etnografic.ro", "https://maps.google.com/?q=Muzeul+Etnografic+Cluj"),
            makePlace("filarmonica-cluj", "Filarmonica de Stat Transilvania", "Strada Emil Isac 19, Cluj-Napoca", 4.8, "Concerte simfonice și evenimente muzicale premium.", "Program concerte", "0264 430 060", "https://filarmonica-transilvania.ro", "https://maps.google.com/?q=Filarmonica+Cluj"),
        ],
        evenimente: [
            makePlace("bt-arena-cluj", "BT Arena", "Aleea Stadionului 4, Cluj-Napoca", 4.7, "Arenă majoră pentru concerte și competiții sportive.", "Program variabil", "0264 483 160", "https://btarena.ro", "https://maps.google.com/?q=BT+Arena+Cluj"),
            makePlace("cluj-arena", "Cluj Arena", "Strada Stadionului 2, Cluj-Napoca", 4.6, "Stadion modern pentru meciuri și evenimente mari.", "Program variabil", "0264 450 654", "https://clujarena.ro", "https://maps.google.com/?q=Cluj+Arena"),
            makePlace("electric-castle", "Electric Castle", "Bonțida, Cluj", 4.7, "Festival internațional de muzică, foarte bine cotat.", "Sezonier", "0364 730 000", "https://electriccastle.ro", "https://maps.google.com/?q=Electric+Castle"),
            makePlace("untold-festival", "UNTOLD Festival", "Cluj Arena, Cluj-Napoca", 4.8, "Unul dintre cele mai mari festivaluri de muzică din Europa.", "Sezonier", "0731 000 000", "https://untold.com", "https://maps.google.com/?q=UNTOLD+Festival+Cluj"),
            makePlace("piata-unirii-events-cluj", "Piața Unirii (Evenimente)", "Piața Unirii, Cluj-Napoca", 4.6, "Piață centrală folosită pentru târguri și evenimente urbane.", "Program variabil", "0264 596 030", "https://primariaclujnapoca.ro", "https://maps.google.com/?q=Piata+Unirii+Cluj"),
        ],
        natura: [],
    },
    "bucuresti": {
        restaurante: [
            makePlace("caru-cu-bere", "Caru' cu Bere", "Strada Stavropoleos 5, București", 4.6, "Restaurant istoric, foarte apreciat pentru atmosferă și meniu tradițional.", "08:00 - 00:00", "0734 560 000", "https://www.carucubere.ro", "https://maps.google.com/?q=Caru+cu+Bere+Bucuresti"),
            makePlace("hanu-lui-manuc", "Hanul lui Manuc", "Strada Franceză 62-64, București", 4.6, "Loc emblematic cu bucătărie românească și terasă mare.", "10:00 - 00:00", "021 335 9275", "https://www.hanulluimanuc.ro", "https://maps.google.com/?q=Hanul+lui+Manuc"),
            makePlace("kaiamo", "KAIAMO", "Strada Ermil Pangratti 30A, București", 4.8, "Fine dining contemporan, bine cotat în ghiduri locale.", "17:00 - 23:00", "0723 138 111", "https://kaiamo.ro", "https://maps.google.com/?q=KAIAMO+Bucuresti"),
            makePlace("soro-lume", "Soro Lume", "Strada Fluierului 10, București", 4.7, "Meniu creativ reinterpretat din bucătăria românească.", "12:30 - 23:00", "0740 091 239", "https://sorolume.ro", "https://maps.google.com/?q=Soro+Lume+Bucuresti"),
            makePlace("lacrimi-si-sfinti", "Lacrimi și Sfinți", "Strada Șepcari 16, București", 4.6, "Restaurant cu specific românesc și design autentic.", "12:00 - 23:30", "0741 222 233", "https://www.facebook.com/lacrimisisfinti", "https://maps.google.com/?q=Lacrimi+si+Sfinti+Bucuresti"),
        ],
        cafenele: [
            makePlace("origo", "Origo Coffee", "Strada Lipscani 9, București", 4.7, "Una dintre cele mai apreciate cafenele specialty din oraș.", "08:00 - 20:00", "0766 555 988", "https://www.facebook.com/origocoffee", "https://maps.google.com/?q=Origo+Coffee+Bucuresti"),
            makePlace("sloane", "Sloane Coffee", "Strada C.A. Rosetti 17, București", 4.7, "Cafea de specialitate și atmosferă premium.", "08:00 - 20:00", "0737 001 122", "https://sloane.coffee", "https://maps.google.com/?q=Sloane+Coffee+Bucuresti"),
            makePlace("m60", "M60", "Strada D.I. Mendeleev 2, București", 4.6, "Cafea bună, brunch și spațiu modern.", "08:00 - 22:00", "0741 778 838", "https://www.facebook.com/m60cafe", "https://maps.google.com/?q=M60+Bucuresti"),
            makePlace("frudisiac", "Frudisiac", "Strada Vasile Lascăr 48-50, București", 4.6, "Brunch & coffee spot foarte popular în centru.", "08:00 - 18:00", "0730 009 886", "https://frudisiac.com", "https://maps.google.com/?q=Frudisiac+Bucuresti"),
            makePlace("bob-coffee-lab", "BOB Coffee Lab", "Strada Episcopiei 6, București", 4.7, "Specialty coffee și produse artizanale.", "08:00 - 19:00", "0724 430 111", "https://www.facebook.com/bobcoffeelab", "https://maps.google.com/?q=BOB+Coffee+Lab+Bucuresti"),
        ],
        institutii: [
            makePlace("primaria-capitalei", "Primăria Municipiului București", "Bd. Regina Elisabeta 47, București", 4.1, "Instituția administrativă centrală a capitalei.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "021 305 5500", "https://www.pmb.ro", "https://maps.google.com/?q=Primaria+Capitalei"),
            makePlace("prefectura-bucuresti", "Prefectura Municipiului București", "Bd. Regina Elisabeta 47, București", 4.1, "Servicii administrative și coordonare instituțională.", "L-V 08:30 - 16:30", "021 315 6565", "https://b.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Bucuresti"),
            makePlace("anaf-bucuresti", "ANAF - DGRFP București", "Strada Lucrețiu Pătrășcanu 10, București", 4.0, "Servicii fiscale pentru persoane fizice și juridice.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "021 408 9150", "https://www.anaf.ro", "https://maps.google.com/?q=ANAF+Bucuresti"),
            makePlace("spitalul-universitar", "Spitalul Universitar de Urgență", "Splaiul Independenței 169, București", 4.2, "Spital universitar major cu servicii de urgență.", "Non-stop (UPU)", "021 318 0500", "https://www.suub.ro", "https://maps.google.com/?q=Spitalul+Universitar+Bucuresti"),
            makePlace("directia-taxe-bucuresti", "Direcția Impozite și Taxe Locale Sector 1", "Strada Grigore Alexandrescu 4, București", 4.0, "Plăți și administrare taxe locale.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "021 314 9090", "https://www.impozitelocale1.ro", "https://maps.google.com/?q=DITL+Sector+1+Bucuresti"),
        ],
        cultural: [
            makePlace("teatrul-national-bucuresti", "Teatrul Național I.L. Caragiale", "Bd. Nicolae Bălcescu 2, București", 4.8, "Teatru de referință cu producții importante.", "Program spectacole", "021 314 7171", "https://www.tnb.ro", "https://maps.google.com/?q=Teatrul+National+Bucuresti"),
            makePlace("atheneul-roman", "Ateneul Român", "Strada Benjamin Franklin 1-3, București", 4.8, "Clădire emblematică și sală de concerte a Filarmonicii.", "Program concerte", "021 315 6875", "https://www.fge.org.ro", "https://maps.google.com/?q=Ateneul+Roman"),
            makePlace("mnar", "Muzeul Național de Artă al României", "Calea Victoriei 49-53, București", 4.7, "Colecții naționale de artă veche și modernă.", "Ma-D 11:00 - 19:00", "021 314 8119", "https://www.mnar.arts.ro", "https://maps.google.com/?q=MNAR+Bucuresti"),
            makePlace("muzeul-satului", "Muzeul Național al Satului Dimitrie Gusti", "Șoseaua Kiseleff 28-30, București", 4.8, "Muzeu în aer liber cu patrimoniu etnografic românesc.", "09:00 - 19:00", "021 317 9103", "https://muzeul-satului.ro", "https://maps.google.com/?q=Muzeul+Satului+Bucuresti"),
            makePlace("opera-nationala-bucuresti", "Opera Națională București", "Bd. Mihail Kogălniceanu 70-72, București", 4.7, "Spectacole de operă și balet cu distribuții de top.", "Program spectacole", "021 314 6980", "https://operanb.ro", "https://maps.google.com/?q=Opera+Nationala+Bucuresti"),
        ],
        evenimente: [
            makePlace("arena-nationala", "Arena Națională", "Bd. Basarabia 37-39, București", 4.6, "Stadion mare pentru meciuri și concerte.", "Program variabil", "021 318 5200", "https://www.arenanationala.ro", "https://maps.google.com/?q=Arena+Nationala"),
            makePlace("romexpo", "ROMEXPO", "Bd. Mărăști 65-67, București", 4.5, "Complex expozițional pentru târguri și conferințe.", "Program variabil", "021 207 7000", "https://romexpo.ro", "https://maps.google.com/?q=Romexpo+Bucuresti"),
            makePlace("sala-palatului", "Sala Palatului", "Strada Ion Câmpineanu 28, București", 4.6, "Evenimente mari, concerte și spectacole.", "Program variabil", "021 315 5310", "https://salapalatului.ro", "https://maps.google.com/?q=Sala+Palatului+Bucuresti"),
            makePlace("beraria-h", "Berăria H", "Șoseaua Kiseleff 32, București", 4.5, "Locație mare de concerte și evenimente live.", "Program variabil", "0725 345 345", "https://berariah.ro", "https://maps.google.com/?q=Beraria+H+Bucuresti"),
            makePlace("piata-constitutiei-events", "Piața Constituției (Evenimente)", "Piața Constituției, București", 4.6, "Spațiu urban pentru festivaluri, târguri și concerte.", "Program variabil", "021 305 5500", "https://www.pmb.ro", "https://maps.google.com/?q=Piata+Constitutiei+Bucuresti"),
        ],
        natura: [],
    },
    "oradea": {
        restaurante: [
            makePlace("ristorante-corsarul", "Ristorante Corsarul", "Calea Republicii 1, Oradea", 4.6, "Restaurant apreciat pentru preparate mediteraneene.", "11:00 - 23:00", "0756 789 100", "https://www.facebook.com/ristorantecorsarul", "https://maps.google.com/?q=Ristorante+Corsarul+Oradea"),
            makePlace("hanul-cu-noroc-oradea", "Hanul cu Noroc", "Strada Vasile Alecsandri 5, Oradea", 4.5, "Meniu românesc și atmosferă tradițională.", "10:00 - 23:00", "0752 338 800", "https://www.facebook.com/hanulcunorocoradea", "https://maps.google.com/?q=Hanul+cu+Noroc+Oradea"),
            makePlace("via29", "Via29", "Strada Aurel Lazăr 1, Oradea", 4.6, "Restaurant modern, cunoscut pentru plating și gust.", "12:00 - 23:00", "0733 555 229", "https://www.facebook.com/via29oradea", "https://maps.google.com/?q=Via29+Oradea"),
            makePlace("better-food", "Better Food", "Piața Unirii 2, Oradea", 4.5, "Restaurant casual cu opțiuni fresh și rapide.", "09:00 - 22:00", "0747 889 991", "https://www.facebook.com/betterfoodoradea", "https://maps.google.com/?q=Better+Food+Oradea"),
            makePlace("piata9", "Piata9", "Strada Primăriei 4, Oradea", 4.6, "Meniu urban, apreciat de localnici și turiști.", "09:00 - 23:00", "0770 309 009", "https://www.facebook.com/piata9oradea", "https://maps.google.com/?q=Piata9+Oradea"),
        ],
        cafenele: [
            makePlace("street-coffee-roasters", "Street Coffee Roasters", "Strada Republicii 15, Oradea", 4.7, "Cafea de specialitate și ambient relaxat.", "08:00 - 19:00", "0741 500 333", "https://www.facebook.com/streetcoffeeroasters", "https://maps.google.com/?q=Street+Coffee+Roasters+Oradea"),
            makePlace("rivo-cafe", "Rivo Cafe", "Piața Unirii 5, Oradea", 4.6, "Cafenea centrală, bună pentru întâlniri și lucru.", "08:00 - 22:00", "0259 430 700", "https://www.facebook.com/rivocafeoradea", "https://maps.google.com/?q=Rivo+Cafe+Oradea"),
            makePlace("meron-oradea", "Meron Oradea", "Strada Alecsandri 7, Oradea", 4.7, "Specialty coffee, setup modern și personal bun.", "08:00 - 20:00", "0731 101 201", "https://meron.coffee", "https://maps.google.com/?q=Meron+Oradea"),
            makePlace("dock-cafe", "Dock Specialty Coffee", "Strada Aurel Lazăr 3, Oradea", 4.6, "Cafea de origine și deserturi de casă.", "08:00 - 19:00", "0748 606 300", "https://www.facebook.com/dockspecialtycoffee", "https://maps.google.com/?q=Dock+Specialty+Coffee+Oradea"),
            makePlace("moszkva-cafe", "Moszkva Cafe", "Strada Republicii 11, Oradea", 4.5, "Cafenea cu design retro și meniu variat.", "09:00 - 22:00", "0743 212 889", "https://www.facebook.com/moszkvacafeoradea", "https://maps.google.com/?q=Moszkva+Cafe+Oradea"),
        ],
        institutii: [
            makePlace("primaria-oradea", "Primăria Oradea", "Piața Unirii 1, Oradea", 4.4, "Administrația locală a municipiului Oradea.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0259 437 000", "https://oradea.ro", "https://maps.google.com/?q=Primaria+Oradea"),
            makePlace("consiliul-judetean-bihor", "Consiliul Județean Bihor", "Parcul Traian 5, Oradea", 4.2, "Instituție administrativă la nivel de județ.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0259 403 200", "https://www.cjbihor.ro", "https://maps.google.com/?q=Consiliul+Judetean+Bihor"),
            makePlace("prefectura-bihor", "Prefectura Bihor", "Parcul Traian 5, Oradea", 4.1, "Instituție prefecturală pentru servicii administrative.", "L-V 08:30 - 16:30", "0259 412 766", "https://bh.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Bihor"),
            makePlace("spitalul-judetean-oradea", "Spitalul Clinic Județean Oradea", "Strada Gheorghe Doja 65, Oradea", 4.2, "Spital județean cu servicii medicale complexe.", "Non-stop (UPU)", "0259 414 931", "https://www.spitaljudetean-oradea.ro", "https://maps.google.com/?q=Spitalul+Judetean+Oradea"),
            makePlace("taxe-impozite-oradea", "Direcția Taxe și Impozite Oradea", "Piața Unirii 1, Oradea", 4.1, "Servicii de taxe locale pentru cetățeni și firme.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0259 437 000", "https://oradea.ro", "https://maps.google.com/?q=Taxe+si+Impozite+Oradea"),
        ],
        cultural: [
            makePlace("teatrul-regina-maria", "Teatrul Regina Maria", "Piața Ferdinand 4-6, Oradea", 4.8, "Instituție de spectacol importantă în vestul țării.", "Program spectacole", "0259 440 742", "https://www.teatrulreginamaria.ro", "https://maps.google.com/?q=Teatrul+Regina+Maria+Oradea"),
            makePlace("filarmonica-oradea", "Filarmonica de Stat Oradea", "Strada Moscovei 5, Oradea", 4.7, "Concerte simfonice și evenimente muzicale.", "Program concerte", "0259 430 853", "https://www.filarmonicaoradea.ro", "https://maps.google.com/?q=Filarmonica+Oradea"),
            makePlace("muzeul-tarii-crisurilor", "Muzeul Țării Crișurilor", "Strada Armatei Române 1/A, Oradea", 4.7, "Muzeu complex cu secții de istorie, artă și științe.", "Ma-D 10:00 - 18:00", "0259 479 336", "https://muzeulcrisurilor.ro", "https://maps.google.com/?q=Muzeul+Tarii+Crisurilor+Oradea"),
            makePlace("casa-darvas", "Casa Darvas-La Roche", "Strada Iosif Vulcan 11, Oradea", 4.7, "Muzeu Art Nouveau foarte apreciat de turiști.", "Ma-D 10:00 - 18:00", "0770 197 287", "https://oradea.ro", "https://maps.google.com/?q=Casa+Darvas+La+Roche+Oradea"),
            makePlace("teatrul-szigligeti", "Teatrul Szigligeti", "Piața Ferdinand 4-6, Oradea", 4.6, "Teatru cu producții în limba maghiară și repertoriu variat.", "Program spectacole", "0259 440 742", "https://www.szigligeti.ro", "https://maps.google.com/?q=Teatrul+Szigligeti+Oradea"),
        ],
        evenimente: [
            makePlace("oradea-arena", "Oradea Arena", "Strada Traian Blajovici 24, Oradea", 4.7, "Arenă modernă pentru sport și evenimente mari.", "Program variabil", "0259 408 830", "https://www.csmoradea.ro", "https://maps.google.com/?q=Oradea+Arena"),
            makePlace("cetatea-oradea-events", "Cetatea Oradea (Evenimente)", "Strada Griviței 13, Oradea", 4.7, "Hub cultural cu festivaluri, târguri și expoziții.", "Program variabil", "0259 478 191", "https://www.cetateaoradea.ro", "https://maps.google.com/?q=Cetatea+Oradea"),
            makePlace("piata-unirii-oradea-events", "Piața Unirii (Evenimente)", "Piața Unirii, Oradea", 4.6, "Evenimente urbane sezoniere în centrul orașului.", "Program variabil", "0259 437 000", "https://oradea.ro", "https://maps.google.com/?q=Piata+Unirii+Oradea"),
            makePlace("teatrul-regina-maria-events", "Teatrul Regina Maria (Events)", "Piața Ferdinand 4-6, Oradea", 4.8, "Premiere și festivaluri de teatru pe parcursul anului.", "Program variabil", "0259 440 742", "https://www.teatrulreginamaria.ro", "https://maps.google.com/?q=Teatrul+Regina+Maria+Oradea"),
            makePlace("nufarul-festival", "Festivaluri Nufărul (zona centrală)", "Zona centrală, Oradea", 4.5, "Serii de evenimente locale cu muzică și activități stradale.", "Sezonier", "0259 437 000", "https://oradea.ro", "https://maps.google.com/?q=Evenimente+Oradea+Centru"),
        ],
        natura: [],
    },
    "timisoara": {
        restaurante: [
            makePlace("locanda-del-corso", "Locanda del Corso", "Strada Augustin Pacha 8, Timișoara", 4.7, "Restaurant italian foarte bine evaluat, atmosferă elegantă.", "12:00 - 23:00", "0753 077 777", "https://www.facebook.com/locandadelcorso", "https://maps.google.com/?q=Locanda+del+Corso+Timisoara"),
            makePlace("merlot-timisoara", "Merlot", "Strada Mărășești 1-3, Timișoara", 4.6, "Restaurant central, meniu premium și servicii bune.", "12:00 - 23:00", "0733 991 123", "https://www.facebook.com/merlottimisoara", "https://maps.google.com/?q=Merlot+Timisoara"),
            makePlace("little-hanoi", "Little Hanoi", "Strada Vasile Alecsandri 8, Timișoara", 4.7, "Restaurant asiatic apreciat pentru gust și consistență.", "12:00 - 22:30", "0722 263 030", "https://www.facebook.com/littlehanoitimisoara", "https://maps.google.com/?q=Little+Hanoi+Timisoara"),
            makePlace("homemade-timisoara", "Homemade", "Strada Eugeniu de Savoya 6, Timișoara", 4.6, "Loc popular pentru paste, burgeri și brunch.", "09:00 - 23:00", "0758 061 061", "https://www.homemade.ro", "https://maps.google.com/?q=Homemade+Timisoara"),
            makePlace("vinto", "Vinto Gastro Wine Bar", "Strada Eugeniu de Savoya 7, Timișoara", 4.7, "Meniu modern cu pairing de vinuri, apreciat local.", "12:00 - 00:00", "0744 673 838", "https://vinto.ro", "https://maps.google.com/?q=Vinto+Timisoara"),
        ],
        cafenele: [
            makePlace("ovride-specialty", "Ovride Specialty Coffee", "Piața Unirii 7, Timișoara", 4.8, "Cafea de specialitate și ambient minimalist.", "08:00 - 19:00", "0743 542 018", "https://www.instagram.com/ovridecoffee", "https://maps.google.com/?q=Ovride+Specialty+Coffee+Timisoara"),
            makePlace("doppio-timisoara", "Doppio", "Strada Mercy 9, Timișoara", 4.7, "Specialty coffee și vibe urban central.", "08:00 - 20:00", "0742 516 110", "https://www.facebook.com/doppiotimisoara", "https://maps.google.com/?q=Doppio+Timisoara"),
            makePlace("garage-cafe", "Garage Cafe", "Strada Florimund Mercy 4, Timișoara", 4.6, "Cafenea populară pentru întâlniri și lucru remote.", "08:00 - 22:00", "0756 329 003", "https://www.facebook.com/garagecafebar", "https://maps.google.com/?q=Garage+Cafe+Timisoara"),
            makePlace("staftim", "STAFTIM Coffee", "Strada Victor Vlad Delamarina 1, Timișoara", 4.6, "Cafea bună, servire rapidă și locație centrală.", "08:00 - 19:00", "0740 730 555", "https://www.facebook.com/staftim", "https://maps.google.com/?q=STAFTIM+Coffee+Timisoara"),
            makePlace("scartz-cafe", "Scârț Loc Lejer (Cafe)", "Strada Arh. Laszlo Szekely 1, Timișoara", 4.7, "Loc boem, preferat pentru cultură urbană și cafea.", "10:00 - 23:00", "0735 420 111", "https://www.facebook.com/scartloclejer", "https://maps.google.com/?q=Scart+Loc+Lejer+Timisoara"),
        ],
        institutii: [
            makePlace("primaria-timisoara", "Primăria Timișoara", "Bd. C.D. Loga 1, Timișoara", 4.3, "Administrația locală a municipiului Timișoara.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0256 408 300", "https://www.primariatm.ro", "https://maps.google.com/?q=Primaria+Timisoara"),
            makePlace("consiliul-judetean-timis", "Consiliul Județean Timiș", "Bd. Revoluției din 1989 17, Timișoara", 4.2, "Instituție administrativă județeană.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0256 406 300", "https://www.cjtimis.ro", "https://maps.google.com/?q=Consiliul+Judetean+Timis"),
            makePlace("prefectura-timis", "Prefectura Timiș", "Bd. Revoluției din 1989 17, Timișoara", 4.1, "Instituția prefectului pentru servicii administrative.", "L-V 08:30 - 16:30", "0256 490 626", "https://tm.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Timis"),
            makePlace("spitalul-judetean-timisoara", "Spitalul Clinic Județean Timișoara", "Bd. Liviu Rebreanu 156, Timișoara", 4.2, "Spital regional important cu secții multiple.", "Non-stop (UPU)", "0256 309 500", "https://www.hosptm.ro", "https://maps.google.com/?q=Spitalul+Judetean+Timisoara"),
            makePlace("taxe-impozite-timisoara", "Direcția Fiscală Timișoara", "Strada Aristide Demetriade 1, Timișoara", 4.0, "Gestionare taxe locale și relații cu contribuabili.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0256 408 979", "https://www.primariatm.ro", "https://maps.google.com/?q=Directia+Fiscala+Timisoara"),
        ],
        cultural: [
            makePlace("teatrul-national-timisoara", "Teatrul Național Timișoara", "Strada Mărășești 2, Timișoara", 4.8, "Teatru de referință cu producții apreciate.", "Program spectacole", "0256 201 117", "https://www.tntimisoara.com", "https://maps.google.com/?q=Teatrul+National+Timisoara"),
            makePlace("opera-romana-timisoara", "Opera Națională Română Timișoara", "Piața Victoriei 2, Timișoara", 4.8, "Operă și balet în inima orașului.", "Program spectacole", "0256 201 286", "https://www.ort.ro", "https://maps.google.com/?q=Opera+Timisoara"),
            makePlace("muzeul-national-al-banatului", "Muzeul Național al Banatului", "Castelul Huniade, Timișoara", 4.7, "Muzeu istoric important pentru regiunea Banat.", "Ma-D 10:00 - 18:00", "0256 201 321", "https://mnab.ro", "https://maps.google.com/?q=Muzeul+National+al+Banatului"),
            makePlace("muzeul-de-arta-timisoara", "Muzeul de Artă Timișoara", "Piața Unirii 1, Timișoara", 4.7, "Colecții de artă românească și europeană.", "Ma-D 10:00 - 18:00", "0256 491 592", "https://muzeuldeartatm.ro", "https://maps.google.com/?q=Muzeul+de+Arta+Timisoara"),
            makePlace("filarmonica-banatul", "Filarmonica Banatul", "Bd. C.D. Loga 2, Timișoara", 4.8, "Concerte simfonice și evenimente de muzică clasică.", "Program concerte", "0256 494 414", "https://filarmonicabanatul.ro", "https://maps.google.com/?q=Filarmonica+Banatul"),
        ],
        evenimente: [
            makePlace("sala-olympia", "Sala Olimpia", "Aleea F.C. Ripensia 7, Timișoara", 4.6, "Arenă pentru sport și evenimente publice.", "Program variabil", "0256 406 710", "https://www.primariatm.ro", "https://maps.google.com/?q=Sala+Olimpia+Timisoara"),
            makePlace("iulius-congress-hall", "Iulius Congress Hall", "Piața Consiliul Europei 2, Timișoara", 4.6, "Loc pentru conferințe și evenimente corporate.", "Program variabil", "0256 490 888", "https://iuliustown.ro", "https://maps.google.com/?q=Iulius+Congress+Hall+Timisoara"),
            makePlace("piata-victoriei-events-tm", "Piața Victoriei (Evenimente)", "Piața Victoriei, Timișoara", 4.7, "Concerte și evenimente urbane majore.", "Program variabil", "0256 408 300", "https://www.primariatm.ro", "https://maps.google.com/?q=Piata+Victoriei+Timisoara"),
            makePlace("teatrul-national-events-tm", "Teatrul Național (Evenimente)", "Strada Mărășești 2, Timișoara", 4.8, "Festivaluri și premiere teatrale pe tot anul.", "Program variabil", "0256 201 117", "https://www.tntimisoara.com", "https://maps.google.com/?q=Teatrul+National+Timisoara"),
            makePlace("flight-festival", "Flight Festival", "Muzeul Satului Bănățean, Timișoara", 4.6, "Festival de muzică și tehnologie, foarte popular vara.", "Sezonier", "0740 300 111", "https://flight-festival.com", "https://maps.google.com/?q=Flight+Festival+Timisoara"),
        ],
        natura: [],
    },
    "brasov": {
        restaurante: [
            makePlace("sub-tampa", "Sub Tâmpa", "Aleea Tiberiu Brediceanu 2, Brașov", 4.7, "Restaurant apreciat pentru priveliște și preparate locale.", "11:00 - 23:00", "0728 800 800", "https://subtampa.ro", "https://maps.google.com/?q=Sub+Tampa+Brasov"),
            makePlace("dei-frati", "Dei Frati", "Strada Diaconu Coresi 2, Brașov", 4.8, "Restaurant italian foarte bine evaluat de localnici.", "12:00 - 23:00", "0722 363 200", "https://www.facebook.com/deifratibv", "https://maps.google.com/?q=Dei+Frati+Brasov"),
            makePlace("sergiana", "Sergiana", "Strada Mureșenilor 28, Brașov", 4.6, "Meniu românesc tradițional, foarte popular.", "10:00 - 23:00", "0268 417 775", "https://sergianagrup.ro", "https://maps.google.com/?q=Sergiana+Brasov"),
            makePlace("la-ceaun", "La Ceaun", "Piața Sfatului 11, Brașov", 4.6, "Loc central pentru mâncare românească autentică.", "10:00 - 23:00", "0749 665 665", "https://www.facebook.com/laceaunbrasov", "https://maps.google.com/?q=La+Ceaun+Brasov"),
            makePlace("bistro-del-arte", "Bistro de l'Arte", "Piața Enescu George 11bis, Brașov", 4.7, "Bistro artistic cu atmosferă boemă și meniu creativ.", "09:00 - 23:00", "0268 475 475", "https://www.bistrodelarte.ro", "https://maps.google.com/?q=Bistro+de+l%27Arte+Brasov"),
        ],
        cafenele: [
            makePlace("croitoria-de-cafea", "Croitoria de Cafea", "Strada Michael Weiss 11, Brașov", 4.8, "Specialty coffee, local foarte apreciat în centru.", "08:00 - 20:00", "0742 099 331", "https://www.facebook.com/croitoriadecafea", "https://maps.google.com/?q=Croitoria+de+Cafea+Brasov"),
            makePlace("tipografia", "Tipografia", "Piața George Enescu 11, Brașov", 4.7, "Cafenea modernă, atmosferă bună pentru socializare.", "09:00 - 23:00", "0731 333 171", "https://www.facebook.com/tipografiabv", "https://maps.google.com/?q=Tipografia+Brasov"),
            makePlace("news-caffe", "News Caffe", "Piața Sfatului 24, Brașov", 4.6, "Cafenea centrală cu terasă în piață.", "08:00 - 23:00", "0268 472 211", "https://www.facebook.com/newscaffebrasov", "https://maps.google.com/?q=News+Caffe+Brasov"),
            makePlace("cafeneaua-de-acasa", "Cafeneaua de Acasă", "Strada Republicii 16, Brașov", 4.6, "Loc cozy, bun pentru cafea și desert.", "09:00 - 21:00", "0740 822 922", "https://www.facebook.com/cafeneauadeacasa", "https://maps.google.com/?q=Cafeneaua+de+Acasa+Brasov"),
            makePlace("book-coffee-shop", "Book Coffee Shop", "Strada Postăvarului 31, Brașov", 4.5, "Cafenea mică, liniștită, cu vibe relaxat.", "08:30 - 20:00", "0741 600 118", "https://www.facebook.com/bookcoffeeshopbv", "https://maps.google.com/?q=Book+Coffee+Shop+Brasov"),
        ],
        institutii: [
            makePlace("primaria-brasov", "Primăria Brașov", "Bd. Eroilor 8, Brașov", 4.3, "Administrația locală a municipiului Brașov.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0268 405 000", "https://www.brasovcity.ro", "https://maps.google.com/?q=Primaria+Brasov"),
            makePlace("consiliul-judetean-brasov", "Consiliul Județean Brașov", "Bd. Eroilor 5, Brașov", 4.2, "Instituție administrativă la nivel județean.", "L-J 08:00 - 16:30, V 08:00 - 14:00", "0268 410 777", "https://cjbrasov.ro", "https://maps.google.com/?q=Consiliul+Judetean+Brasov"),
            makePlace("prefectura-brasov", "Prefectura Brașov", "Bd. Eroilor 5, Brașov", 4.1, "Instituția prefectului pentru servicii administrative.", "L-V 08:30 - 16:30", "0268 410 210", "https://bv.prefectura.mai.gov.ro", "https://maps.google.com/?q=Prefectura+Brasov"),
            makePlace("spitalul-judetean-brasov", "Spitalul Clinic Județean Brașov", "Calea București 25-27, Brașov", 4.2, "Spital județean cu servicii medicale extinse.", "Non-stop (UPU)", "0268 320 022", "https://www.hospbv.ro", "https://maps.google.com/?q=Spitalul+Judetean+Brasov"),
            makePlace("taxe-impozite-brasov", "Direcția Fiscală Brașov", "Strada Dorobanților 4, Brașov", 4.0, "Taxe locale și servicii pentru contribuabili.", "L-J 08:30 - 16:30, V 08:30 - 14:00", "0268 416 550", "https://www.brasovcity.ro", "https://maps.google.com/?q=Directia+Fiscala+Brasov"),
        ],
        cultural: [
            makePlace("teatrul-sica-alexandrescu", "Teatrul Sică Alexandrescu", "Strada Mureșenilor 1, Brașov", 4.8, "Teatru important cu repertoriu variat.", "Program spectacole", "0268 418 850", "https://www.teatrulsicaalexandrescu.ro", "https://maps.google.com/?q=Teatrul+Sica+Alexandrescu+Brasov"),
            makePlace("opera-brasov", "Opera Brașov", "Strada Bisericii Române 51, Brașov", 4.8, "Spectacole de operă, operetă și balet.", "Program spectacole", "0268 419 380", "https://www.operabrasov.ro", "https://maps.google.com/?q=Opera+Brasov"),
            makePlace("muzeul-de-arta-brasov", "Muzeul de Artă Brașov", "Bd. Eroilor 21A, Brașov", 4.7, "Colecții valoroase de artă românească.", "Ma-D 10:00 - 18:00", "0268 477 286", "https://muzeuldeartabrasov.ro", "https://maps.google.com/?q=Muzeul+de+Arta+Brasov"),
            makePlace("prima-scoala-romaneasca", "Prima Școală Românească", "Piața Unirii 2-3, Brașov", 4.8, "Muzeu istoric foarte căutat de turiști.", "09:00 - 17:00", "0268 511 820", "https://www.primascoalabrasov.ro", "https://maps.google.com/?q=Prima+Scoala+Romaneasca+Brasov"),
            makePlace("centrul-cultural-reduta", "Centrul Cultural Reduta", "Strada Apollonia Hirscher 8, Brașov", 4.7, "Evenimente culturale și spectacole locale.", "Program evenimente", "0268 419 706", "https://centrulculturalreduta.ro", "https://maps.google.com/?q=Centrul+Cultural+Reduta+Brasov"),
        ],
        evenimente: [
            makePlace("piata-sfatului-events", "Piața Sfatului (Evenimente)", "Piața Sfatului, Brașov", 4.8, "Concerte, târguri și evenimente sezoniere în centru.", "Program variabil", "0268 405 000", "https://www.brasovcity.ro", "https://maps.google.com/?q=Piata+Sfatului+Brasov"),
            makePlace("parcul-nicolae-titulescu-events", "Parcul Nicolae Titulescu (Events)", "Bd. Eroilor, Brașov", 4.6, "Spațiu verde folosit pentru evenimente publice.", "Program variabil", "0268 405 000", "https://www.brasovcity.ro", "https://maps.google.com/?q=Parcul+Nicolae+Titulescu+Brasov"),
            makePlace("olympia-brasov-events", "Centrul Sportiv Olimpia", "Strada George Coșbuc 2, Brașov", 4.5, "Competiții sportive și activări locale.", "Program variabil", "0268 547 149", "https://www.olympiabrasov.ro", "https://maps.google.com/?q=Olimpia+Brasov"),
            makePlace("reduta-events", "Centrul Cultural Reduta (Events)", "Strada Apollonia Hirscher 8, Brașov", 4.7, "Festivaluri locale și evenimente culturale.", "Program variabil", "0268 419 706", "https://centrulculturalreduta.ro", "https://maps.google.com/?q=Reduta+Brasov"),
            makePlace("junii-brasovului", "Parada Junilor Brașovului", "Șcheii Brașovului", 4.8, "Eveniment tradițional emblematic pentru Brașov.", "Sezonier", "0268 472 050", "https://www.brasovtourism.app", "https://maps.google.com/?q=Junii+Brasovului"),
        ],
        natura: [],
    },
};

export function isCitySlug(slug: string): slug is CitySlug {
    return slug in placesByCity;
}

export function isCategorySlug(city: CitySlug, category: string): category is CategorySlug {
    return category in placesByCity[city];
}
*/
/*
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
            {
                id: "l-ulivo",
                name: "L'ulivo",
                image: "/images/place-placeholder.jpg",
                address: "Bulevardul București, Baia Mare",
                rating: 4.6,
                description: "Restaurant italian cunoscut pentru paste, pizza și atmosferă elegantă.",
                schedule: "12:00 - 23:00",
                website: "https://www.facebook.com/lulivobaiamare",
                mapsUrl: "https://maps.google.com/?q=L%27ulivo+Baia+Mare"
            },
            {
                id: "budapesta",
                name: "Budapesta",
                image: "/images/place-placeholder.jpg",
                address: "Strada Vasile Alecsandri, Baia Mare",
                rating: 4.5,
                description: "Restaurant apreciat pentru preparate tradiționale și porții generoase.",
                schedule: "10:00 - 22:00",
                mapsUrl: "https://maps.google.com/?q=Restaurant+Budapesta+Baia+Mare"
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
            {
                id: "code-coffee",
                name: "Code Coffee Shop & Roastery",
                image: "/images/place-placeholder.jpg",
                address: "Strada Progresului 58-60, Baia Mare",
                rating: 4.8,
                description: "Specialty coffee shop popular, bun pentru lucru și întâlniri casual.",
                schedule: "L-V 07:30 - 19:30, S-D 08:30 - 18:00",
                website: "https://europeancoffeetrip.com/cafe/codecoffeeshop-baiamare/",
                mapsUrl: "https://maps.google.com/?q=Code+Coffee+Shop+Baia+Mare"
            },
            {
                id: "rox-specialty-coffee",
                name: "Rox - Specialty Coffee",
                image: "/images/place-placeholder.jpg",
                address: "Strada Culturii 9, Baia Mare",
                rating: 4.9,
                description: "Cafea de specialitate, spațiu modern și servicii foarte apreciate.",
                schedule: "L-V 07:00 - 18:00, S-D 08:00 - 16:00",
                phone: "0772 057 313",
                website: "https://europeancoffeetrip.com/cafe/roxspecialtycoffee-baiamare/",
                mapsUrl: "https://maps.google.com/?q=Rox+Specialty+Coffee+Baia+Mare"
            },
            {
                id: "pressco-cafe",
                name: "Pressco",
                image: "/images/place-placeholder.jpg",
                address: "Bulevardul Regele Mihai I 2, Baia Mare",
                rating: 4.7,
                description: "Cafenea centrală cu atmosferă plăcută și opțiuni bune pentru mic dejun.",
                schedule: "07:30 - 17:00",
                phone: "0751 900 926",
                mapsUrl: "https://maps.google.com/?q=Pressco+Baia+Mare"
            },
            {
                id: "log-out-cafe",
                name: "Log Out",
                image: "/images/place-placeholder.jpg",
                address: "Centru, Baia Mare",
                rating: 4.6,
                description: "Loc liniștit pentru cafea și socializare, preferat de tineri.",
                mapsUrl: "https://maps.google.com/?q=Log+Out+Baia+Mare"
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
            {
                id: "judecatoria-baia-mare",
                name: "Judecătoria Baia Mare",
                image: "/images/place-placeholder.jpg",
                address: "Bd. Republicii 2A, Baia Mare",
                rating: 4.4,
                description: "Instituție judiciară locală, cu servicii de registratură și arhivă pentru public.",
                schedule: "L-V 08:00 - 12:00 (registratură/arhivă)",
                phone: "0262 218 235",
                website: "https://portal.just.ro/182/",
                mapsUrl: "https://maps.google.com/?q=Judecatoria+Baia+Mare"
            },
            {
                id: "consiliul-judetean-maramures",
                name: "Consiliul Județean Maramureș",
                image: "/images/place-placeholder.jpg",
                address: "Strada Gheorghe Șincai 46, Baia Mare",
                rating: 4.3,
                description: "Instituție administrativă județeană pentru proiecte publice și servicii locale.",
                website: "https://www.cjmaramures.ro",
                mapsUrl: "https://maps.google.com/?q=Consiliul+Judetean+Maramures+Baia+Mare"
            },
            {
                id: "directia-impozite-si-taxe-baia-mare",
                name: "Direcția de Impozite și Taxe Locale",
                image: "/images/place-placeholder.jpg",
                address: "Strada Crișan 2, Baia Mare",
                rating: 4.2,
                description: "Punct administrativ pentru taxe locale, plăți și informații pentru contribuabili.",
                mapsUrl: "https://maps.google.com/?q=Directia+de+Impozite+si+Taxe+Locale+Baia+Mare"
            },
            {
                id: "spitalul-judetean-baia-mare",
                name: "Spitalul Județean de Urgență Dr. Constantin Opriș",
                image: "/images/place-placeholder.jpg",
                address: "Strada George Coșbuc 31, Baia Mare",
                rating: 4.1,
                description: "Unitate medicală principală din oraș, cu servicii de urgență și specialități multiple.",
                schedule: "Non-stop (UPU)",
                website: "https://www.spitaljbm.ro",
                mapsUrl: "https://maps.google.com/?q=Spitalul+Judetean+de+Urgenta+Baia+Mare"
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
            {
                id: "muzeul-de-arta-baia-mare",
                name: "Muzeul de Artă Baia Mare",
                image: "/images/place-placeholder.jpg",
                address: "Strada 1 Mai 8, Baia Mare",
                rating: 4.7,
                description: "Muzeu important pentru arta modernă și patrimoniul artistic local.",
                schedule: "Ma-D 10:00 - 17:00, L închis",
                phone: "0262 213 964",
                website: "https://muzartbm.ro",
                mapsUrl: "https://maps.google.com/?q=Muzeul+de+Arta+Baia+Mare"
            },
            {
                id: "muzeul-satului-baia-mare",
                name: "Muzeul Satului Baia Mare",
                image: "/images/place-placeholder.jpg",
                address: "Strada Dealul Florilor 1, Baia Mare",
                rating: 4.7,
                description: "Muzeu în aer liber cu gospodării tradiționale și patrimoniu etnografic maramureșean.",
                mapsUrl: "https://maps.google.com/?q=Muzeul+Satului+Baia+Mare"
            },
            {
                id: "colonia-pictorilor",
                name: "Colonia Pictorilor",
                image: "/images/place-placeholder.jpg",
                address: "Strada Victoriei 21, Baia Mare",
                rating: 4.6,
                description: "Spațiu cultural istoric dedicat artei vizuale, expozițiilor și atelierelor.",
                mapsUrl: "https://maps.google.com/?q=Colonia+Pictorilor+Baia+Mare"
            },
            {
                id: "bastionul-macelarilor",
                name: "Bastionul Măcelarilor",
                image: "/images/place-placeholder.jpg",
                address: "Centrul Vechi, Baia Mare",
                rating: 4.5,
                description: "Obiectiv istoric reabilitat, folosit pentru expoziții și activități culturale.",
                mapsUrl: "https://maps.google.com/?q=Bastionul+Macelarilor+Baia+Mare"
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
            {
                id: "sala-sporturilor-lascar-pana",
                name: "Sala Sporturilor Lascăr Pană",
                image: "/images/place-placeholder.jpg",
                address: "Bd. Unirii 14A, Baia Mare",
                rating: 4.6,
                description: "Principală sală de evenimente sportive și spectacole indoor din oraș.",
                website: "https://csnlascarpana.ro",
                mapsUrl: "https://maps.google.com/?q=Sala+Sporturilor+Lascar+Pana+Baia+Mare"
            },
            {
                id: "teatrul-municipal-evenimente",
                name: "Teatrul Municipal (Evenimente)",
                image: "/images/place-placeholder.jpg",
                address: "Strada Crișan 8, Baia Mare",
                rating: 4.7,
                description: "Program constant de spectacole, premiere și festivaluri locale.",
                phone: "0262 211 124",
                website: "http://teatrulbm.ro",
                mapsUrl: "https://maps.google.com/?q=Teatrul+Municipal+Baia+Mare"
            },
            {
                id: "piata-libertatii-evenimente",
                name: "Piața Libertății (Evenimente publice)",
                image: "/images/place-placeholder.jpg",
                address: "Centrul Vechi, Baia Mare",
                rating: 4.5,
                description: "Piață centrală folosită frecvent pentru târguri, concerte și evenimente sezoniere.",
                mapsUrl: "https://maps.google.com/?q=Piata+Libertatii+Baia+Mare"
            },
            {
                id: "festivalul-castanelor",
                name: "Festivalul Castanelor",
                image: "/images/place-placeholder.jpg",
                address: "Baia Mare (diverse zone centrale)",
                rating: 4.7,
                description: "Cel mai cunoscut festival local, cu muzică live, food zone și activități pentru comunitate.",
                website: "https://www.baiamare.ro",
                mapsUrl: "https://maps.google.com/?q=Festivalul+Castanelor+Baia+Mare"
            },
        ],
    },
    "cluj-napoca": {
        restaurante: [],
        cafenele: [],
        institutii: [],
        cultural: [],
        evenimente: [],
    },
    "bucuresti": {
        restaurante: [],
        cafenele: [],
        institutii: [],
        cultural: [],
        evenimente: [],
    },
    "oradea": {
        restaurante: [],
        cafenele: [],
        institutii: [],
        cultural: [],
        evenimente: [],
    },
    "timisoara": {
        restaurante: [],
        cafenele: [],
        institutii: [],
        cultural: [],
        evenimente: [],
    },
    "brasov": {
        restaurante: [],
        cafenele: [],
        institutii: [],
        cultural: [],
        evenimente: [],
    },
} as const;

export type PlacesByCity = typeof placesByCity;
export type CitySlug = keyof PlacesByCity;
export type CategorySlug = keyof PlacesByCity[CitySlug];

export function isCitySlug(slug: string): slug is CitySlug {
    return slug in placesByCity;
}

export function isCategorySlug(city: CitySlug, category: string): category is CategorySlug {
    return category in placesByCity[city];
}
*/