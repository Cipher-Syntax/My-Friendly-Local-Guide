import React, { useState } from 'react';
import { IoIosArrowRoundForward } from "react-icons/io";
import FeaturePlace1 from '../assets/featured1.png';
import FeaturePlace2 from '../assets/featured2.png';
import FeaturePlace3 from '../assets/featured3.png';

import DiscoverPlace1 from '../assets/discover1.png';
import DiscoverPlace2 from '../assets/discover2.png';
import DiscoverPlace3 from '../assets/discover3.png';
import DiscoverPlace4 from '../assets/discover4.png';
import { NavigationBar } from '../components'

const FeaturedPlaces = () => {
    const [isActive, setisActive] = useState(2);

    const FeatureCards = [
        { id: 1, image: FeaturePlace1 },
        { id: 2, image: FeaturePlace2 },
        { id: 3, image: FeaturePlace3 },
        { id: 4, image: FeaturePlace1 },
        { id: 5, image: FeaturePlace2 },
        { id: 6, image: FeaturePlace3 },
    ];

    const DiscoverWhatYouWant = [
        { id: 1, image: DiscoverPlace1, name: "BEACHES" },
        { id: 2, image: DiscoverPlace2, name: "MOUNTAINS" },
        { id: 3, image: DiscoverPlace3, name: "RIVERS" },
        { id: 4, image: DiscoverPlace4, name: "CITY"},
    ]

    return (
        <section className="mt-10 mb-30">
            <div className="p-3">
                <h1 className="text-[14px] uppercase leading-relaxed tracking-wider">Featured Places</h1>
                <p className="text-[10px]">
                    Handpicked by locals. Loved by travelers. Discover your next stop!
                </p>
            </div>

            <div className="flex overflow-x-scroll gap-3 px-3 pb-3 pr-6 scrollbar-hide">
                {FeatureCards.map((feature) => (
                    <div
                        key={feature.id}
                        className="relative min-w-[180px] h-[180px] flex-shrink-0 rounded-xl overflow-hidden group"
                    >
                        <div className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:brightness-75" style={{ backgroundImage: `url(${feature.image})` }}></div>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent"></div>
                        <div className="absolute bottom-3 left-2 flex items-center text-white text-[12px] font-medium">
                            <span>Discover More</span>
                            <IoIosArrowRoundForward className="text-[20px] ml-1" />
                        </div>
                    </div>
                ))}
            </div>



           <div className="mt-10">
                <h2 className="text-center mb-4 text-[16px] uppercase tracking-wider font-medium">Discover What You Want</h2>

                <div className="flex h-[350px] w-full overflow-hidden">
                    {
                        DiscoverWhatYouWant.map((item) => (
                            <div key={item.id} onClick={() => setisActive(item.id)} className={`relative cursor-pointer transition-all duration-500 ease-in-out overflow-hidden ${isActive === item.id ? "flex-[4]" : "flex-[1]"}`}>
                                <img src={item.image} alt={item.name} className={`object-cover w-full h-full transition duration-500 ${ isActive === item.id ? "brightness-100" : "brightness-75"}`}/>
                                <div className="absolute inset-0 flex justify-center items-center">
                                    <span
                                        className={`font-semibold tracking-widest transition-all duration-300 ${
                                        isActive === item.id
                                            ? "rotate-0 text-[18px] bg-gradient-to-r from-[#FFFFFF] to-[#00C6FF] bg-clip-text text-transparent"
                                            : "-rotate-90 text-2xl bg-gradient-to-r from-[#FFFFFF] to-[#00C6FF] bg-clip-text text-transparent inline-block"
                                        }`}
                                    >
                                        {item.name}
                                    </span>
                                </div>


                                {
                                    isActive === item.id && (
                                        <div className="absolute bottom-6 right-6 left-6 text-center">
                                            <p className='text-[10px] bg-gradient-to-r from-[#FFFFFF] to-[#00C6FF] bg-clip-text text-transparent'>Discover more breathtaking {item.name.toLowerCase()} spots</p>
                                        </div>
                                    )
                                }
                            </div>
                        ))
                    }
                </div>

            </div>

            <div className='p-2 mt-3'>
                <p className='text-[10px] text-center'>Pick your paradise — from golden beaches to buzzing cities and serene mountains. Discover your kind of escape!</p>
            </div>

            <NavigationBar></NavigationBar>
        </section>

    );
};

export default FeaturedPlaces;
