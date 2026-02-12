/**
 * Preset Templates for DMS Template Manager
 * 6 professionally designed preset templates
 */

window.presetTemplates = [
    // 1. Classic Template
    {
        id: 'preset_classic',
        nameKey: 'Classic Template',
        layout: {marginTop:8,marginBottom:8,marginLeft:8,marginRight:8,dayBlockSpacing:6,dayBlockPadding:'10px 12px',columnGap:10},
        header: {text:'Weekly Menu',color:'#fd7e14',fontSize:'20pt',fontWeight:'bold',fontFamily:'Segoe UI',textAlign:'center',textTransform:'none',lineHeight:'1.2'},
        dateRange: {show:true,fontSize:'9pt',color:'#7f8c8d',fontWeight:'normal',textAlign:'center'},
        dayBlock: {bg:'#ffffff',borderRadius:'8px',borderWidth:'2',borderColor:'#e0e0e0',borderStyle:'solid',borderSides:'all',shadow:'none',padding:'10px 12px'},
        dayName: {fontSize:'11pt',color:'#2c3e50',fontWeight:'600',fontFamily:'inherit',lineHeight:'1.2',textAlign:'left',textTransform:'none'},
        mealTitle: {fontSize:'9pt',color:'#333333',fontWeight:'600',fontFamily:'inherit',lineHeight:'1.2',textAlign:'left'},
        mealNumbering: {style:'numbers',prefix:'',suffix:'.'},
        ingredients: {fontSize:'7.5pt',color:'#555555',fontStyle:'italic',lineHeight:'1.2'},
        separators: {headerEnabled:false,headerStyle:'solid',headerColor:'#ddd',headerWidth:1,footerEnabled:true,footerStyle:'solid',footerColor:'#eee',footerWidth:1},
        footer: {text:'Prepared with care by KitchenPro',fontSize:'8pt',color:'#7f8c8d',textAlign:'center'},
        background: {image:'',opacity:1,position:'center',overlay:'',overlayOpacity:0},
        branding: {logo:'',logoPosition:'top-right',logoWidth:80,logoHeight:80},
        pageBorder: {enabled:false,width:1,color:'#000000',style:'solid',radius:0},
        backgroundImage: '',
        slotSettings: {slot1:{showIngredients:true,showCalories:true,showAllergens:true},slot2:{showIngredients:true,showCalories:true,showAllergens:true},slot3:{showIngredients:true,showCalories:true,showAllergens:true},slot4:{showIngredients:true,showCalories:true,showAllergens:true}}
    },
    
    // 2. Modern Minimalist
    {
        id: 'preset_minimalist',
        nameKey: 'Modern Minimalist',
        layout: {marginTop:12,marginBottom:12,marginLeft:15,marginRight:15,dayBlockSpacing:10,dayBlockPadding:'12px 15px',columnGap:12},
        header: {text:'WEEKLY MENU',color:'#2c3e50',fontSize:'22pt',fontWeight:'600',fontFamily:'Arial',textAlign:'left',textTransform:'uppercase',lineHeight:'1.1'},
        dateRange: {show:true,fontSize:'8.5pt',color:'#95a5a6',fontWeight:'normal',textAlign:'left'},
        dayBlock: {bg:'#fafafa',borderRadius:'0px',borderWidth:'0',borderColor:'#e0e0e0',borderStyle:'solid',borderSides:'bottom',shadow:'none',padding:'12px 15px'},
        dayName: {fontSize:'10pt',color:'#34495e',fontWeight:'bold',fontFamily:'Arial',lineHeight:'1.2',textAlign:'left',textTransform:'uppercase'},
        mealTitle: {fontSize:'9pt',color:'#2c3e50',fontWeight:'500',fontFamily:'Arial',lineHeight:'1.2',textAlign:'left'},
        mealNumbering: {style:'bullets',prefix:'',suffix:''},
        ingredients: {fontSize:'7.5pt',color:'#7f8c8d',fontStyle:'normal',lineHeight:'1.2'},
        separators: {headerEnabled:true,headerStyle:'solid',headerColor:'#bdc3c7',headerWidth:2,footerEnabled:false,footerStyle:'solid',footerColor:'#eee',footerWidth:1},
        footer: {text:'',fontSize:'7.5pt',color:'#95a5a6',textAlign:'center'},
        background: {image:'',opacity:1,position:'center',overlay:'',overlayOpacity:0},
        branding: {logo:'',logoPosition:'top-right',logoWidth:60,logoHeight:60},
        pageBorder: {enabled:false,width:1,color:'#000000',style:'solid',radius:0},
        backgroundImage: '',
        slotSettings: {slot1:{showIngredients:true,showCalories:false,showAllergens:true},slot2:{showIngredients:true,showCalories:false,showAllergens:true},slot3:{showIngredients:true,showCalories:false,showAllergens:true},slot4:{showIngredients:true,showCalories:false,showAllergens:true}}
    },
    
    // 3. Colorful & Bold
    {
        id: 'preset_colorful',
        nameKey: 'Colorful & Bold',
        layout: {marginTop:8,marginBottom:8,marginLeft:8,marginRight:8,dayBlockSpacing:8,dayBlockPadding:'12px 14px',columnGap:10},
        header: {text:'🍽️ This Week\'s Menu',color:'#e74c3c',fontSize:'24pt',fontWeight:'bold',fontFamily:'Segoe UI',textAlign:'center',textTransform:'none',lineHeight:'1.2'},
        dateRange: {show:true,fontSize:'9.5pt',color:'#e67e22',fontWeight:'600',textAlign:'center'},
        dayBlock: {bg:'#fff9e6',borderRadius:'12px',borderWidth:'3',borderColor:'#f39c12',borderStyle:'solid',borderSides:'all',shadow:'medium',padding:'12px 14px'},
        dayName: {fontSize:'12pt',color:'#c0392b',fontWeight:'bold',fontFamily:'Segoe UI',lineHeight:'1.2',textAlign:'center',textTransform:'uppercase'},
        mealTitle: {fontSize:'9.5pt',color:'#d35400',fontWeight:'bold',fontFamily:'Segoe UI',lineHeight:'1.2',textAlign:'left'},
        mealNumbering: {style:'numbers',prefix:'#',suffix:''},
        ingredients: {fontSize:'8pt',color:'#7f8c8d',fontStyle:'italic',lineHeight:'1.2'},
        separators: {headerEnabled:true,headerStyle:'double',headerColor:'#e74c3c',headerWidth:3,footerEnabled:true,footerStyle:'dashed',footerColor:'#f39c12',footerWidth:2},
        footer: {text:'✨ Enjoy your meals!',fontSize:'8.5pt',color:'#e67e22',textAlign:'center'},
        background: {image:'',opacity:1,position:'center',overlay:'',overlayOpacity:0},
        branding: {logo:'',logoPosition:'top-center',logoWidth:100,logoHeight:100},
        pageBorder: {enabled:true,width:3,color:'#e74c3c',style:'double',radius:8},
        backgroundImage: '',
        slotSettings: {slot1:{showIngredients:true,showCalories:true,showAllergens:true},slot2:{showIngredients:true,showCalories:true,showAllergens:true},slot3:{showIngredients:true,showCalories:true,showAllergens:true},slot4:{showIngredients:true,showCalories:true,showAllergens:true}}
    },
    
    // 4. Professional Corporate
    {
        id: 'preset_corporate',
        nameKey: 'Professional Corporate',
        layout: {marginTop:10,marginBottom:10,marginLeft:12,marginRight:12,dayBlockSpacing:5,dayBlockPadding:'10px 12px',columnGap:10},
        header: {text:'Weekly Meal Plan',color:'#1a5490',fontSize:'18pt',fontWeight:'bold',fontFamily:'Georgia',textAlign:'center',textTransform:'capitalize',lineHeight:'1.2'},
        dateRange: {show:true,fontSize:'8.5pt',color:'#34495e',fontWeight:'normal',textAlign:'center'},
        dayBlock: {bg:'#f8f9fa',borderRadius:'4px',borderWidth:'1',borderColor:'#1a5490',borderStyle:'solid',borderSides:'left',shadow:'light',padding:'10px 12px'},
        dayName: {fontSize:'10.5pt',color:'#1a5490',fontWeight:'bold',fontFamily:'Georgia',lineHeight:'1.2',textAlign:'left',textTransform:'capitalize'},
        mealTitle: {fontSize:'9pt',color:'#2c3e50',fontWeight:'600',fontFamily:'Georgia',lineHeight:'1.2',textAlign:'left'},
        mealNumbering: {style:'roman',prefix:'',suffix:'.'},
        ingredients: {fontSize:'7.5pt',color:'#566573',fontStyle:'normal',lineHeight:'1.2'},
        separators: {headerEnabled:true,headerStyle:'solid',headerColor:'#1a5490',headerWidth:2,footerEnabled:true,footerStyle:'solid',footerColor:'#95a5a6',footerWidth:1},
        footer: {text:'Corporate Dining Services',fontSize:'7.5pt',color:'#7f8c8d',textAlign:'center'},
        background: {image:'',opacity:1,position:'center',overlay:'',overlayOpacity:0},
        branding: {logo:'',logoPosition:'top-left',logoWidth:70,logoHeight:70},
        pageBorder: {enabled:true,width:2,color:'#1a5490',style:'solid',radius:0},
        backgroundImage: '',
        slotSettings: {slot1:{showIngredients:true,showCalories:true,showAllergens:true},slot2:{showIngredients:true,showCalories:true,showAllergens:true},slot3:{showIngredients:false,showCalories:true,showAllergens:true},slot4:{showIngredients:false,showCalories:true,showAllergens:true}}
    },
    
    // 5. Elegant Casual
    {
        id: 'preset_elegant',
        nameKey: 'Elegant Casual',
        layout: {marginTop:10,marginBottom:10,marginLeft:10,marginRight:10,dayBlockSpacing:7,dayBlockPadding:'12px 14px',columnGap:10},
        header: {text:'Weekly Menu',color:'#8e44ad',fontSize:'21pt',fontWeight:'600',fontFamily:'Georgia',textAlign:'center',textTransform:'capitalize',lineHeight:'1.2'},
        dateRange: {show:true,fontSize:'9pt',color:'#9b59b6',fontWeight:'normal',textAlign:'center'},
        dayBlock: {bg:'#f9f7fc',borderRadius:'10px',borderWidth:'2',borderColor:'#d7bde2',borderStyle:'solid',borderSides:'all',shadow:'light',padding:'12px 14px'},
        dayName: {fontSize:'11pt',color:'#8e44ad',fontWeight:'bold',fontFamily:'Georgia',lineHeight:'1.2',textAlign:'left',textTransform:'capitalize'},
        mealTitle: {fontSize:'9pt',color:'#5b2c6f',fontWeight:'600',fontFamily:'Georgia',lineHeight:'1.2',textAlign:'left'},
        mealNumbering: {style:'letters',prefix:'',suffix:')'},
        ingredients: {fontSize:'7.5pt',color:'#7d3c98',fontStyle:'italic',lineHeight:'1.2'},
        separators: {headerEnabled:true,headerStyle:'solid',headerColor:'#d7bde2',headerWidth:1,footerEnabled:true,footerStyle:'solid',footerColor:'#e8daef',footerWidth:1},
        footer: {text:'Bon appétit!',fontSize:'8pt',color:'#9b59b6',textAlign:'center'},
        background: {image:'',opacity:1,position:'center',overlay:'',overlayOpacity:0},
        branding: {logo:'',logoPosition:'top-right',logoWidth:75,logoHeight:75},
        pageBorder: {enabled:false,width:1,color:'#000000',style:'solid',radius:0},
        backgroundImage: '',
        slotSettings: {slot1:{showIngredients:true,showCalories:true,showAllergens:true},slot2:{showIngredients:true,showCalories:true,showAllergens:true},slot3:{showIngredients:true,showCalories:false,showAllergens:true},slot4:{showIngredients:true,showCalories:false,showAllergens:true}}
    },
    
    // 6. Health-Focused
    {
        id: 'preset_health',
        nameKey: 'Health-Focused',
        layout: {marginTop:8,marginBottom:8,marginLeft:8,marginRight:8,dayBlockSpacing:6,dayBlockPadding:'12px',columnGap:10},
        header: {text:'Healthy Weekly Menu',color:'#27ae60',fontSize:'20pt',fontWeight:'bold',fontFamily:'Arial',textAlign:'center',textTransform:'none',lineHeight:'1.2'},
        dateRange: {show:true,fontSize:'9pt',color:'#16a085',fontWeight:'600',textAlign:'center'},
        dayBlock: {bg:'#f1f9f7',borderRadius:'6px',borderWidth:'2',borderColor:'#a9dfbf',borderStyle:'solid',borderSides:'all',shadow:'light',padding:'12px'},
        dayName: {fontSize:'11pt',color:'#1e8449',fontWeight:'bold',fontFamily:'Arial',lineHeight:'1.2',textAlign:'left',textTransform:'capitalize'},
        mealTitle: {fontSize:'9pt',color:'#239b56',fontWeight:'600',fontFamily:'Arial',lineHeight:'1.2',textAlign:'left'},
        mealNumbering: {style:'numbers',prefix:'',suffix:'.'},
        ingredients: {fontSize:'7.5pt',color:'#1abc9c',fontStyle:'normal',lineHeight:'1.2'},
        separators: {headerEnabled:true,headerStyle:'solid',headerColor:'#abebc6',headerWidth:2,footerEnabled:true,footerStyle:'solid',footerColor:'#d5f4e6',footerWidth:1},
        footer: {text:'Nourish your body, fuel your life',fontSize:'8pt',color:'#16a085',textAlign:'center'},
        background: {image:'',opacity:1,position:'center',overlay:'',overlayOpacity:0},
        branding: {logo:'',logoPosition:'top-center',logoWidth:80,logoHeight:80},
        pageBorder: {enabled:true,width:1,color:'#27ae60',style:'solid',radius:5},
        backgroundImage: '',
        slotSettings: {slot1:{showIngredients:true,showCalories:true,showAllergens:true},slot2:{showIngredients:true,showCalories:true,showAllergens:true},slot3:{showIngredients:true,showCalories:true,showAllergens:true},slot4:{showIngredients:true,showCalories:true,showAllergens:true}}
    }
];
