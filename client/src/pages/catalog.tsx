import ItemGallery from "../Components/ItemGallery";

export const CatalogPage: React.FC = () => {

    const SAMPLE_ITEMS = [
        {
            id: 1,
            cuantity: 20,
            image: null,
            title: "Montañas del Cocora",
            author: "Naturaleza",
            tag: "Destacado",
            price: "45.000",
        },
        {
            id: 2,
            cuantity: 3,
            image: "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=400&q=80",
            title: "Desierto de la Tatacoa",
            author: "Aventura",
            tag: "Nuevo",
            price: "204.000",
            synopsis: "asdfghjk ltseadxyitf tfs33s cdfs erq7e5wq7resfx s4wq34ew65ed67trfp ggtyders2w634ce 5fbg7n frd 263w4e85r6t7, yt75ev45w3w534srtdrtst, uttyd5rew45ec64v65rfbv56e45w475etrdfjgd rtw e5wrtsdyerdeaey xfgut rsrujr eser siyfl tuyfrtdt  kytdtrs 5edk.",
        },
        {
            id: 3,
            cuantity: 50,
            image: "https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=400&q=80",
            title: "Lago Calima",
            author: "Agua",
            tag: "normal",
            price: "97.000",
        },
        {
            id: 4,
            cuantity: 5,
            image: "https://images.unsplash.com/photo-1518173946687-a4c8892bbd9f?w=400&q=80",
            title: "Jardín, Antioquia",
            author: "Cultura",
            tag: "Popular",
            price: "135.000",
        },
        {
            id: 5,
            cuantity: 30,
            image: "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=400&q=80",
            title: "Capurganá",
            author: "Playa",
            tag: "normal",
            price: "140.000",
        },
        {
            id: 6,
            cuantity: 1,
            image: "https://images.unsplash.com/photo-1443890923422-7819ed4101c0?w=400&q=80",
            title: "Caño Cristales",
            author: "Naturaleza",
            tag: "Exclusivo",
            price: "100.000",
        },
    ];

    return (
        <div className="w-full h-auto">
            <ItemGallery items={SAMPLE_ITEMS} title="Destinos" />
        </div>
    );
};

export default CatalogPage;