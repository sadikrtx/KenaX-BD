export interface BangladeshLocationData {
  [division: string]: {
    districts: {
      [district: string]: {
        upazilas: string[];
      };
    };
  };
}

export const BANGLADESH_LOCATIONS: BangladeshLocationData = {
  Dhaka: {
    districts: {
      Dhaka: {
        upazilas: [
          'Dhanmondi',
          'Gulshan',
          'Banani',
          'Uttara',
          'Mirpur',
          'Mohammadpur',
          'Motijheel',
          'Tejgaon',
          'Badda',
          'Khilgaon',
          'Rampura',
          'Malibagh',
          'Old Dhaka (Puran Dhaka)',
          'Bashundhara R/A',
          'Baridhara',
          'Lalbagh',
          'Jatrabari',
          'Savar',
          'Keraniganj',
          'Dhamrai',
          'Ashulia',
          'Tongi',
        ],
      },
      Gazipur: {
        upazilas: ['Gazipur Sadar', 'Kaliakair', 'Kapasia', 'Sreepur', 'Kaliganj'],
      },
      Narayanganj: {
        upazilas: ['Narayanganj Sadar', 'Bandar', 'Rupganj', 'Araihazar', 'Sonargaon'],
      },
      Tangail: {
        upazilas: ['Tangail Sadar', 'Mirzapur', 'Ghatail', 'Madhupur', 'Sakhipur', 'Kalihati', 'Bhuapur'],
      },
      Narsingdi: {
        upazilas: ['Narsingdi Sadar', 'Palash', 'Shibpur', 'Raipura', 'Monohardi', 'Belabo'],
      },
      Manikganj: {
        upazilas: ['Manikganj Sadar', 'Singair', 'Saturia', 'Shibalaya', 'Ghior', 'Harirampur'],
      },
      Munshiganj: {
        upazilas: ['Munshiganj Sadar', 'Sreenagar', 'Sirajdikhan', 'Louhajang', 'Tongibari', 'Gazaria'],
      },
      Faridpur: {
        upazilas: ['Faridpur Sadar', 'Boalmari', 'Bhanga', 'Madhukhali', 'Alfadanga', 'Nagarkanda'],
      },
      Kishoreganj: {
        upazilas: ['Kishoreganj Sadar', 'Bhairab', 'Bajitpur', 'Katiadi', 'Kuliarchar', 'Pakundia'],
      },
      Gopalganj: {
        upazilas: ['Gopalganj Sadar', 'Tungipara', 'Kotalipara', 'Kashiani', 'Muksudpur'],
      },
      Madaripur: {
        upazilas: ['Madaripur Sadar', 'Shibchar', 'Kalkini', 'Rajoir'],
      },
      Rajbari: {
        upazilas: ['Rajbari Sadar', 'Goalanda', 'Pangsha', 'Baliakandi', 'Kalukhali'],
      },
      Shariatpur: {
        upazilas: ['Shariatpur Sadar', 'Zajira', 'Naria', 'Bhedarganj', 'Damudya', 'Gosairhat'],
      },
    },
  },
  Chattogram: {
    districts: {
      Chattogram: {
        upazilas: [
          'Panchlaish',
          'Kotwali',
          'Agrabad',
          'Halishahar',
          'Khulshi',
          'Nasirabad',
          'Pahartali',
          'Patenga',
          'Hathazari',
          'Sitakunda',
          'Mirsharai',
          'Patiya',
          'Raozan',
          'Boalkhali',
          'Anwara',
          'Fatikchhari',
        ],
      },
      "Cox's Bazar": {
        upazilas: ["Cox's Bazar Sadar", 'Teknaf', 'Ukhiya', 'Ramu', 'Chakaria', 'Pekua', 'Kutubdia', 'Maheshkhali'],
      },
      Cumilla: {
        upazilas: ['Cumilla Adarsha Sadar', 'Cumilla Sadar Dakshin', 'Daudkandi', 'Chandina', 'Laksam', 'Debidwar', 'Muradnagar', 'Burichang'],
      },
      Feni: {
        upazilas: ['Feni Sadar', 'Daganbhuiyan', 'Chhagalnaiya', 'Parshuram', 'Sonagazi', 'Fulgazi'],
      },
      Brahmanbaria: {
        upazilas: ['Brahmanbaria Sadar', 'Ashuganj', 'Sarail', 'Kasba', 'Nabinagar', 'Bancharampur', 'Akhaura'],
      },
      Noakhali: {
        upazilas: ['Noakhali Sadar', 'Begumganj', 'Chatkhil', 'Companyganj', 'Hatiya', 'Senbagh', 'Subarnachar'],
      },
      Chandpur: {
        upazilas: ['Chandpur Sadar', 'Faridganj', 'Hajiganj', 'Matlab Dakshin', 'Matlab Uttar', 'Shahrasti', 'Kachua'],
      },
      Lakshmipur: {
        upazilas: ['Lakshmipur Sadar', 'Raipur', 'Ramganj', 'Ramgati', 'Kamalnagar'],
      },
      Rangamati: {
        upazilas: ['Rangamati Sadar', 'Kaptai', 'Kawkhali', 'Baghaichhari', 'Barkal', 'Langadu'],
      },
      Khagrachhari: {
        upazilas: ['Khagrachhari Sadar', 'Dighinala', 'Panchhari', 'Mahalchhari', 'Matiranga', 'Ramgarh'],
      },
      Bandarban: {
        upazilas: ['Bandarban Sadar', 'Rowangchhari', 'Ruma', 'Thanchi', 'Lama', 'Alikadam', 'Naikhongchhari'],
      },
    },
  },
  Rajshahi: {
    districts: {
      Rajshahi: {
        upazilas: ['Boalia', 'Motihar', 'Rajpara', 'Shah Makhdum', 'Godagari', 'Paba', 'Bagmara', 'Charghat', 'Durgapur', 'Puthia', 'Tanore'],
      },
      Bogura: {
        upazilas: ['Bogura Sadar', 'Shajahanpur', 'Sherpur', 'Shibganj', 'Gabtali', 'Dhunat', 'Kahaloo', 'Nandigram', 'Sariakandi', 'Sonatola', 'Adamdighi'],
      },
      Pabna: {
        upazilas: ['Pabna Sadar', 'Ishwardi', 'Santhia', 'Bera', 'Chatmohar', 'Bhangura', 'Atgharia', 'Sujanagar', 'Faridpur'],
      },
      Sirajganj: {
        upazilas: ['Sirajganj Sadar', 'Shahjadpur', 'Ullahpara', 'Belkuchi', 'Kamarkhanda', 'Kazipur', 'Raiganj', 'Tarash'],
      },
      Naogaon: {
        upazilas: ['Naogaon Sadar', 'Patnitala', 'Dhamoirhat', 'Manda', 'Mohadevpur', 'Niamatpur', 'Raninagar', 'Sapahar'],
      },
      Natore: {
        upazilas: ['Natore Sadar', 'Baraigram', 'Bagatipara', 'Gurudaspur', 'Lalpur', 'Singra'],
      },
      Chapainawabganj: {
        upazilas: ['Chapainawabganj Sadar', 'Shibganj', 'Gomastapur', 'Nachole', 'Bholahat'],
      },
      Joypurhat: {
        upazilas: ['Joypurhat Sadar', 'Panchbibi', 'Kalai', 'Khetlal', 'Akkelpur'],
      },
    },
  },
  Khulna: {
    districts: {
      Khulna: {
        upazilas: ['Khulna Sadar', 'Sonadanga', 'Khalishpur', 'Daulatpur', 'Khan Jahan Ali', 'Dighalia', 'Dumuria', 'Batiaghata', 'Paikgachha', 'Rupsha'],
      },
      Jashore: {
        upazilas: ['Jashore Sadar', 'Sharsha', 'Benapole', 'Jhikargachha', 'Abhaynagar', 'Bagherpara', 'Chaugachha', 'Keshabpur', 'Manirampur'],
      },
      Kushtia: {
        upazilas: ['Kushtia Sadar', 'Kumarkhali', 'Bheramara', 'Mirpur', 'Daulatpur', 'Khoksa'],
      },
      Satkhira: {
        upazilas: ['Satkhira Sadar', 'Assasuni', 'Debhata', 'Kalaroa', 'Kaliganj', 'Shyamnagar', 'Tala'],
      },
      Bagerhat: {
        upazilas: ['Bagerhat Sadar', 'Mongla', 'Morrelganj', 'Fakirhat', 'Kachua', 'Mollahat', 'Rampal', 'Sarankhola'],
      },
      Jhenaidah: {
        upazilas: ['Jhenaidah Sadar', 'Harinakunda', 'Kaliganj', 'Kotchandpur', 'Maheshpur', 'Shailkupa'],
      },
      Chuadanga: {
        upazilas: ['Chuadanga Sadar', 'Alamdanga', 'Damurhuda', 'Jibannagar'],
      },
      Magura: {
        upazilas: ['Magura Sadar', 'Mohammadpur', 'Shalikha', 'Sreepur'],
      },
      Meherpur: {
        upazilas: ['Meherpur Sadar', 'Gangni', 'Mujibnagar'],
      },
      Narail: {
        upazilas: ['Narail Sadar', 'Kalia', 'Lohagara'],
      },
    },
  },
  Sylhet: {
    districts: {
      Sylhet: {
        upazilas: ['Sylhet Sadar', 'Amberkhana', 'Zindabazar', 'Beanibazar', 'Golapganj', 'Zakiganj', 'Kanaighat', 'Fenchuganj', 'Balaganj', 'Biswanath', 'Companiganj'],
      },
      Moulvibazar: {
        upazilas: ['Moulvibazar Sadar', 'Sreemangal', 'Kamalganj', 'Kulaura', 'Barlekha', 'Juri', 'Rajnagar'],
      },
      Habiganj: {
        upazilas: ['Habiganj Sadar', 'Madhabpur', 'Nabiganj', 'Bahubal', 'Chunarughat', 'Baniachong', 'Ajmiriganj', 'Lakhai'],
      },
      Sunamganj: {
        upazilas: ['Sunamganj Sadar', 'Chhatak', 'Jagannathpur', 'Derai', 'Dharampasha', 'Tahirpur', 'Dowarabazar'],
      },
    },
  },
  Barishal: {
    districts: {
      Barishal: {
        upazilas: ['Barishal Sadar', 'Babuganj', 'Bakerganj', 'Banaripara', 'Gaurnadi', 'Hizla', 'Mehendiganj', 'Muladi', 'Wazirpur'],
      },
      Patuakhali: {
        upazilas: ['Patuakhali Sadar', 'Bauphal', 'Galachipa', 'Dashmina', 'Kalapara (Kuakata)', 'Mirzaganj', 'Dumki', 'Rangabali'],
      },
      Bhola: {
        upazilas: ['Bhola Sadar', 'Borhanuddin', 'Char Fasson', 'Daulatkhan', 'Lalmohan', 'Manpura', 'Tazumuddin'],
      },
      Pirojpur: {
        upazilas: ['Pirojpur Sadar', 'Bhandaria', 'Mathbaria', 'Kawkhali', 'Nazirpur', 'Nesarabad (Swarupkati)', 'Indurkani'],
      },
      Barguna: {
        upazilas: ['Barguna Sadar', 'Amtali', 'Betagi', 'Bamna', 'Patharghata', 'Taltali'],
      },
      Jhalokati: {
        upazilas: ['Jhalokati Sadar', 'Kathalia', 'Nalchhiti', 'Rajapur'],
      },
    },
  },
  Rangpur: {
    districts: {
      Rangpur: {
        upazilas: ['Rangpur Sadar', 'Badarganj', 'Gangachhara', 'Kaunia', 'Mithapukur', 'Pirgachha', 'Pirganj', 'Taraganj'],
      },
      Dinajpur: {
        upazilas: ['Dinajpur Sadar', 'Birganj', 'Biral', 'Bochaganj', 'Chirirbandar', 'Fulbari', 'Ghoraghat', 'Hakimpur (Hili)', 'Kaharole', 'Khansama', 'Nawabganj', 'Parbatipur'],
      },
      Kurigram: {
        upazilas: ['Kurigram Sadar', 'Nageshwari', 'Bhurungamari', 'Phulbari', 'Rajarhat', 'Ulipur', 'Chilmari', 'Rowmari', 'Char Rajibpur'],
      },
      Gaibandha: {
        upazilas: ['Gaibandha Sadar', 'Gobindaganj', 'Palashbari', 'Sadullapur', 'Saghata', 'Sundarganj', 'Fulchhari'],
      },
      Nilphamari: {
        upazilas: ['Nilphamari Sadar', 'Saidpur', 'Domar', 'Dimla', 'Jaldhaka', 'Kishoreganj'],
      },
      Lalmonirhat: {
        upazilas: ['Lalmonirhat Sadar', 'Aditmari', 'Kaliganj', 'Hatibandha', 'Patgram'],
      },
      Thakurgaon: {
        upazilas: ['Thakurgaon Sadar', 'Pirganj', 'Ranisankail', 'Haripur', 'Baliadangi'],
      },
      Panchagarh: {
        upazilas: ['Panchagarh Sadar', 'Boda', 'Debiganj', 'Atwari', 'Tetulia'],
      },
    },
  },
  Mymensingh: {
    districts: {
      Mymensingh: {
        upazilas: ['Mymensingh Sadar', 'Muktagachha', 'Fulbaria', 'Trishal', 'Bhaluka', 'Gafargaon', 'Haluaghat', 'Dhobaura', 'Phulpur', 'Tara Khanda', 'Gauripur', 'Ishwarganj', 'Nandail'],
      },
      Jamalpur: {
        upazilas: ['Jamalpur Sadar', 'Melandaha', 'Islampur', 'Dewanganj', 'Sarishabari', 'Madarganj', 'Bakshiganj'],
      },
      Netrokona: {
        upazilas: ['Netrokona Sadar', 'Kendua', 'Atpara', 'Madan', 'Khaliajuri', 'Durgapur', 'Kalmakanda', 'Barhatta', 'Purbadhala', 'Mohanganj'],
      },
      Sherpur: {
        upazilas: ['Sherpur Sadar', 'Nakla', 'Nalitabari', 'Sreebardi', 'Jhenaigati'],
      },
    },
  },
};

export const COMMON_AREAS_BY_THANA: Record<string, string[]> = {
  Dhanmondi: ['Road 27', 'Road 32', 'Satmasjid Road', 'Shankar', 'Sobhanbag', 'Kalabagan', 'Sukrabad', 'Jigatola'],
  Gulshan: ['Gulshan 1', 'Gulshan 2', 'South Avenue', 'North Avenue', 'Gulshan Lake Park Road', 'Niketan'],
  Banani: ['Road 11', 'Block B', 'Block C', 'Block D', 'Block E', 'Chairman Bari', 'Kakoli'],
  Uttara: ['Sector 1', 'Sector 3', 'Sector 4', 'Sector 7', 'Sector 9', 'Sector 11', 'Sector 12', 'Sector 13', 'Sector 14', 'Azampur', 'House Building', 'Abdullahpur'],
  Mirpur: ['Mirpur 1', 'Mirpur 2', 'Mirpur 10', 'Mirpur 11', 'Mirpur 12', 'Mirpur 14', 'Kazipara', 'Shewrapara', 'Pallabi', 'Rupnagar'],
  Mohammadpur: ['Town Hall', 'Japan Garden City', 'Ring Road', 'Salimullah Road', 'Noorjahan Road', 'Tajmahal Road', 'Shekhertek', 'Basila', 'Adabor'],
  Agrabad: ['Badamtali More', 'CDA R/A', 'Commercial Area', 'Chowmuhani', 'Muhuri Para'],
};

export const BANGLADESH_DIVISION_NAMES_BN: Record<string, string> = {
  Dhaka: 'ঢাকা বিভাগ',
  Chattogram: 'চট্টগ্রাম বিভাগ',
  Rajshahi: 'রাজশাহী বিভাগ',
  Khulna: 'খুলনা বিভাগ',
  Barishal: 'বরিশাল বিভাগ',
  Sylhet: 'সিলেট বিভাগ',
  Rangpur: 'রংপুর বিভাগ',
  Mymensingh: 'ময়মনসিংহ বিভাগ',
};

export const BANGLADESH_DISTRICT_NAMES_BN: Record<string, string> = {
  // Dhaka
  Dhaka: 'ঢাকা',
  Gazipur: 'গাজীপুর',
  Narayanganj: 'নারায়ণগঞ্জ',
  Tangail: 'টাঙ্গাইল',
  Narsingdi: 'নরসিংদী',
  Manikganj: 'মানিকগঞ্জ',
  Munshiganj: 'মুন্সীগঞ্জ',
  Faridpur: 'ফরিদপুর',
  Kishoreganj: 'কিশোরগঞ্জ',
  Gopalganj: 'গোপালগঞ্জ',
  Madaripur: 'মাদারীপুর',
  Rajbari: 'রাজবাড়ী',
  Shariatpur: 'শরীয়তপুর',

  // Chattogram
  Chattogram: 'চট্টগ্রাম',
  "Cox's Bazar": 'কক্সবাজার',
  Cumilla: 'কুমিল্লা',
  Feni: 'ফেনী',
  Brahmanbaria: 'ব্রাহ্মণবাড়িয়া',
  Noakhali: 'নোয়াখালী',
  Chandpur: 'চাঁদপুর',
  Lakshmipur: 'লক্ষ্মীপুর',
  Khagrachhari: 'খাগড়াছড়ি',
  Rangamati: 'রাঙ্গামাটি',
  Bandarban: 'বান্দরবান',

  // Rajshahi
  Rajshahi: 'রাজশাহী',
  Bogura: 'বগুড়া',
  Pabna: 'পাবনা',
  Sirajganj: 'সিরাজগঞ্জ',
  Naogaon: 'নওগাঁ',
  Natore: 'নাটোর',
  Chapai_Nawabganj: 'চাঁপাইনবাবগঞ্জ',
  Joypurhat: 'জয়পুরহাট',

  // Khulna
  Khulna: 'খুলনা',
  Jashore: 'যশোর',
  Satkhira: 'সাতক্ষীরা',
  Kushtia: 'কুষ্টিয়া',
  Jhenaidah: 'ঝিনাইদহ',
  Bagerhat: 'বাগেরহাট',
  Chuadanga: 'চুয়াডাঙ্গা',
  Magura: 'মাগুরা',
  Meherpur: 'মেহেরপুর',
  Narail: 'নড়াইল',

  // Barishal
  Barishal: 'বরিশাল',
  Patuakhali: 'পটুয়াখালী',
  Bhola: 'ভোলা',
  Pirojpur: 'পিরোজপুর',
  Barguna: 'বরগুনা',
  Jhalokathi: 'ঝালকাঠি',

  // Sylhet
  Sylhet: 'সিলেট',
  Moulvibazar: 'মৌলভীবাজার',
  Habiganj: 'হবিগঞ্জ',
  Sunamganj: 'সুনামগঞ্জ',

  // Rangpur
  Rangpur: 'রংপুর',
  Dinajpur: 'দিনাজপুর',
  Kurigram: 'কুড়িগ্রাম',
  Gaibandha: 'গাইবান্ধা',
  Nilphamari: 'নীলফামারী',
  Lalmonirhat: 'লালমনিরহাট',
  Thakurgaon: 'ঠাকুরগাঁও',
  Panchagarh: 'পঞ্চগড়',

  // Mymensingh
  Mymensingh: 'ময়মনসিংহ',
  Jamalpur: 'জামালপুর',
  Netrokona: 'নেত্রকোণা',
  Sherpur: 'শেরপুর',
};

