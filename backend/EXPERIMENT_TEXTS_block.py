# =============================================================================
# EXPERIMENT_TEXTS  —  decoupled / single-format structure
# =============================================================================
# Why this differs from the old block:
#   The Detailed (Full-text group) and Skimmed (Skimmed-text group) arms use
#   DIFFERENT passages, each matched within its own arm on its own metrics.
#   So a text is single-format: it has ONE body and ONE format, not a paired
#   TF/TS. Pairing is expressed separately, per arm, in PAIRS below.
#
# Between-subject factor : format  (detailed = TF arm / skimmed = TS arm)
# Within-subject factor  : WordAhead — assigned to ONE of the pair's two texts
#                          at runtime, counterbalanced. Not stored on the text.
#
# Per text:
#   title, level, format, body, metrics (straight from the WordAhead panels),
#   mcqs (5 comprehension items — YOU are preparing these; attention/instructed
#   item is system-injected at quiz position 3; "correct" is 0-INDEXED).
#
# STATUS: B1 Pair 1 loaded (verbatim). Remaining pairs to follow one at a time.
# =============================================================================

EXPERIMENT_TEXTS = {

    # ===== B1 — Pair 1 — DETAILED arm (Full-text group reads these) ===========
    "b1p1_underground": {
        "title": "The first underground train",
        "level": "B1",
        "format": "detailed",
        "metrics": {"words": 385, "difficult": 52, "difficult_pct": 13.5,
                    "sentences": 31, "avg_len": 12.4},
        "body": (
            "Today there are underground train systems in over 40 countries. For example, you can take "
            "underground trains in Paris, New York and Tokyo. Modern underground systems use electric "
            "trains, and they are clean, safe and quiet. They usually arrive on time. There are no traffic jams. "
            "Most people are happy to use them. But the first underground train systems were quite different "
            "from the modern systems we see in big cities all around the world.\n\n"
            "The first underground trains ran in London in 1863. It was a very busy city and the streets were "
            "full of traffic. There were too many people, horse carriages, houses and buildings. There just "
            "wasn\u2019t enough space above ground, and so people decided to put the trains underground. But "
            "unlike today, there were no electric trains in 1863 and all of the trains used steam engines \u2014 "
            "which made power from fire and water.\n\n"
            "In 1863, all of the trains used steam engines. Because these engines were powered by very hot water "
            "and fire, the tunnels were smoky, steamy, and noisy. People wanted some fresh air, but it was difficult "
            "to get it into the tunnels and stations. The tunnels were dark, too. The train cars and stations were "
            "made of wood, and lighted with gas. Sometimes there were accidents because of fires.\n\n"
            "Before the London Underground opened, people were very scared about the idea of going into "
            "underground tunnels. Many were afraid of the tunnels full of the smoke, the steam and the noise "
            "from the train engines. And indeed, travelling in the tunnels of the first underground system was "
            "a very noisy, dark, and smelly experience. But on the first day, the new London Underground "
            "carried 40,000 passengers. It was very quick, and the trains ran every 10 minutes. The people "
            "of London fell in love with their new train system.\n\n"
            "The London Underground had three classes of travel. First class was the most expensive and "
            "most comfortable. Second class was less expensive but still comfortable. Third class was the "
            "opposite of first class. When the London Underground opened, the third class tickets were the "
            "most popular. About 70% of the tickets sold were these cheap tickets for ordinary working "
            "people. Nowadays the prices have gone up, but the underground experience around the world "
            "is definitely cleaner and quieter!"
        ),
        "mcqs": [
            {"question": "What powered the first underground trains?",
             "options": ["Horses", "Electricity", "Steam engines", "Diesel fuel"], "correct": 2},
            {"question": "How did people feel about going into the tunnels before the Underground opened?",
             "options": ["Excited", "Scared", "Bored", "Proud"], "correct": 1},
            {"question": "How many passengers did the new London Underground carry on its first day?",
             "options": ["4,000", "70,000", "40,000", "400,000"], "correct": 2},
            {"question": "Which class of ticket was the most popular when the Underground opened?",
             "options": ["First class", "Second class", "Third class", "They were all equally popular"], "correct": 2},
            {"question": "What were the tunnels of the first underground system like?",
             "options": ["Clean and brightly lit", "Quiet and modern", "Noisy, dark and smelly", "Warm and comfortable"], "correct": 2},
        ],
    },

    "b1p1_seth": {
        "title": "Seth Lakeman (English folk music)",
        "level": "B1",
        "format": "detailed",
        "metrics": {"words": 393, "difficult": 52, "difficult_pct": 13.2,
                    "sentences": 27, "avg_len": 14.6},
        "body": (
            "If you mention the phrase \u2018English folk music\u2019, you find that people either love it or hate it. Many people "
            "think it\u2019s too quiet with a lot of sad songs. They are partly right. But if they go to see the songwriter and "
            "folk musician Seth Lakeman, they might change their minds. It\u2019s true that Seth\u2019s songs are often about "
            "sad events in the past, but his musical style is dramatic and modern, a bit like pop. He plays in a very "
            "energetic way, often with a group, including a loud drummer!\n\n"
            "Seth Lakeman\u2019s first album, called Kitty Jay, nearly won an important music prize and became very "
            "successful as a result. This was surprising, as he recorded it in his brother\u2019s kitchen at a very low cost. "
            "Seth is from a family of well-known folk musicians. His dad, Geoff, often plays in public and sings. Both of "
            "his brothers have also made albums. Seth himself plays the violin, viola, guitar and banjo.\n\n"
            "Seth is not one of those musicians who makes an album and then wants to relax. He finds this difficult. "
            "He\u2019s been on long tours, made over ten albums and performed in many places. If you go to one of the "
            "many summer music festivals in Britain, you are very likely to see him. He has also performed in Europe, "
            "the US and Australia, but the best place he has ever played was Africa.\n\n"
            "One of his most original albums was the 2014 album called \u2018Word of Mouth\u2019. For this, he interviewed a "
            "number of different people and wrote songs using words from the interviews. People have been positive "
            "about the album, even many people who don\u2019t like folk music. He loves experimenting and his most "
            "recent album was also unlike previous ones. His later albums generally have a slower pace than the early "
            "ones, but are no less dramatic.\n\n"
            "Seth loves writing songs. Writing the music comes easily to him, but finding the words is sometimes a "
            "challenge. If he is stuck for ideas, he goes for walks in the countryside, or he goes for a run and tries "
            "again the next day. Touring and performing may be a little more limited in the coming months, as Seth "
            "and his wife have just had twins. But he organises his time well and can\u2019t imagine giving up his musical "
            "career."
        ),
        "mcqs": [
            {"question": "How is Seth Lakeman's musical style described?",
             "options": ["Dramatic and modern, a bit like pop", "Slow and traditional", "Classical and quiet", "Electronic dance music"], "correct": 0},
            {"question": "What is Seth Lakeman's musical background?",
             "options": ["He trained at a music college", "He comes from a family of folk musicians", "He learned music abroad", "He has no musical relatives"], "correct": 1},
            {"question": "For the album 'Word of Mouth', how did Seth write the songs?",
             "options": ["He copied old folk songs", "He wrote them while touring", "He interviewed people and used words from the interviews", "He used poems from books"], "correct": 2},
            {"question": "According to the text, which part of songwriting is most difficult for Seth?",
             "options": ["Writing the music", "Finding the words", "Recording the album", "Performing on stage"], "correct": 1},
            {"question": "Where does the text say is the best place Seth has ever played?",
             "options": ["Britain", "Europe", "The US", "Africa"], "correct": 3},
        ],
    },

    # ===== B1 — Pair 1 — SKIMMED arm (Skimmed-text group reads these) =========
    "b1p1_digital_habits": {
        "title": "Digital habits across generations",
        "level": "B1",
        "format": "skimmed",
        "metrics": {"words": 260, "difficult": 28, "difficult_pct": 10.8,
                    "sentences": 20, "avg_len": 13.0},
        "body": (
            "Today\u2019s grandparents are joining their grandchildren on social media, but the different generations\u2019 online "
            "habits couldn\u2019t be more different. In the UK the over-55s are joining Facebook they will soon be the site\u2019s "
            "second biggest user group, with 3.5 million users aged 55\u201364 and 2.9 million over-65s.\n\n"
            "Sheila, says, \u2018I joined to see what my grandchildren are doing, as my daughter posts videos and photos of\n\n"
            "Sheila\u2019s grandchildren are less likely to use Facebook Children under 17 in the UK are leaving the site "
            "Chloe, sleeps with her phone. \u2018It\u2019s my alarm clock so I have to,\u2019 she says. \u2018I look at it before I go to sleep "
            "and as soon as I wake up.\u2019\n\n"
            "Chloe\u2019s age group is spending time on their phones at home that they are missing out on spending time "
            "with friends in real life. Sheila, has made contact with friends \u2018We use Facebook to arrange to meet all over "
            "the country,\u2019 she says. \u2018It\u2019s changed my social life completely.\u2019\n\n"
            "Teenagers might have their parents to thank for their smartphone addiction Peter, reports he used to be on "
            "his phone or laptop constantly. \u2018I was connected and I felt like I was working,\u2019 he says. he takes card and "
            "puts it into phone \u2018I\u2019m not completely cut off from the world but the important thing is I\u2019m setting a better "
            "example to my kids and spending more quality time with them.\u2019\n\n"
            "Is it only a matter of time until the generation above and below Peter catches up with the new trend for a "
            "less digital life?"
        ),
        "mcqs": [
            {"question": "What is the article mainly about?",
             "options": ["Which phone brand is most popular", "How different age groups use social media and phones differently", "How to set up a Facebook account", "Why social media should be banned"], "correct": 1},
            {"question": "What change does the article describe among older people?",
             "options": ["They are leaving social media", "They are increasingly joining social media such as Facebook", "They no longer use phones at all", "They only send letters by post"], "correct": 1},
            {"question": "For the older person in the article, what has social media mainly allowed her to do?",
             "options": ["Keep up with family and reconnect with old friends", "Run an online business", "Stop using her phone", "Learn a new language"], "correct": 0},
            {"question": "What is happening with younger users, according to the article?",
             "options": ["They are joining Facebook in large numbers", "They have stopped using phones at home", "They are leaving Facebook but spending a lot of time on their smartphones", "They prefer letters to messages"], "correct": 2},
            {"question": "What does the father in the article do, and what does it suggest?",
             "options": ["He buys his children new phones", "He bans all phones completely", "He works only on his phone", "He limits his own phone use to set a better example, suggesting a move toward a less digital life"], "correct": 3},
        ],
    },

    "b1p1_innovation": {
        "title": "Innovation in business",
        "level": "B1",
        "format": "skimmed",
        "metrics": {"words": 237, "difficult": 26, "difficult_pct": 11.0,
                    "sentences": 15, "avg_len": 15.8},
        "body": (
            "What does it mean to be innovative in business?\n\n"
            "for a business to survive review what we are doing considering new ideas and ways of doing things, we "
            "can improve products/services, increase sales, reduce costs and make processes more effective and "
            "efficient. Innovation is key\n\n"
            "ways a company can be innovative Today we will look at four of them.\n\n"
            "Using technology to improve product/service\n\n"
            "When we think of innovation, we think of technologies. we should not use new technologies just because "
            "they are\n\n"
            "Responding to customer demands by changing what is on offer\n\n"
            "listening to customer feedback, we can get opinions on how we are doing and find out what they\n\n"
            "Offering a new product/service\n\n"
            "Your business might be doing well, but there is no growth or development and there is a risk that your "
            "competitors might take away some of your customers. Innovation means developing a product that "
            "targets a market. video games played by boys, Nintendo introduced Nintendo Wii, targeting girls and "
            "older customers with games like Cooking Mama and Brain Training.\n\n"
            "Changing the way you provide a service\n\n"
            "looking at changes to the customer\u2019s lifestyle and needs, we sometimes realise that there might be better "
            "ways to serve them. Customers prefer food delivered or do banking online rather than in an actual bank.\n\n"
            "innovation can give us the opportunity to grow and learn more about what we do and what our customers "
            "might want."
        ),
        "mcqs": [
            {"question": "What does the blog post mainly explain?",
             "options": ["How to start a business with no money", "Why most businesses fail", "How to hire new employees", "Why innovation matters for business and several ways a company can innovate"], "correct": 3},
            {"question": "According to the writer, innovation helps a business to...",
             "options": ["Reduce the number of customers", "Avoid using technology", "Improve products and services, increase sales, cut costs and raise profits", "Keep prices exactly the same"], "correct": 2},
            {"question": "What does the writer say about using new technology?",
             "options": ["A company shouldn't use it just because it's available; it should improve the product for the customer", "Companies should always buy the newest technology", "Technology is never useful for business", "Only large companies can use technology"], "correct": 0},
            {"question": "One way to innovate is to respond to customer demands by...",
             "options": ["Raising prices", "Changing what the business offers, based on customer feedback", "Ignoring complaints", "Reducing opening hours"], "correct": 1},
            {"question": "What does the writer conclude about innovation?",
             "options": ["Innovation always guarantees success", "Innovation is only for technology companies", "Businesses should never change", "Not all innovation succeeds, but it gives a business the chance to grow and learn"], "correct": 3},
        ],
    },

    # ===== B2 — Pair 1 — DETAILED arm (Full-text group reads these) ===========
    "b2p1_plasticbags": {
        "title": "Plastic bags",
        "level": "B2",
        "format": "detailed",
        "metrics": {"words": 510, "difficult": 39, "difficult_pct": 7.6,
                    "sentences": 30, "avg_len": 17.0},
        "body": (
            "When Swedish engineer Sten Gustaf Thulin invented the lightweight plastic shopping bag in the 1960s, "
            "he probably had no idea how controversial they would become, nor for how long the controversy would "
            "last. The fact that the bags proved so useful due to their low weight and resistance to degrading "
            "biologically made them widespread by the 1980s, but also led to environmental challenges. Millions of "
            "shopping bags end up as litter every year. This has resulted in land pollution, blocking of waterways and "
            "also to areas of sea being clogged up with plastic, harming wildlife.\n\n"
            "Different measures have been carried out. A total ban was placed on non-biodegradable plastic bags in "
            "China, to save oil, and in some African countries like Rwanda, to reduce litter. In China this is said to "
            "have saved 4.8 million tonnes of oil and in Rwanda the ban has had a visible effect. As one visitor "
            "commented: \u2018The country is so much cleaner than it used to be.\u2019 The United Arab Emirates also banned "
            "all single-use bags in 2013, based on pollution caused \u2014 and danger to camels, who were eating them.\n\n"
            "Other countries have introduced a \u2018bag tax\u2019, with supermarkets charging customers a small amount for "
            "each plastic bag they use. For example, Ireland introduced such a charge in 2002. Jill Burns of Plastic "
            "Bag Aware said \u2018Ireland\u2019s bag tax has been incredibly successful, mainly because the charge is quite "
            "high, and is increased the more plastic bags are used.\u2019 Despite fears to the contrary, customers accepted "
            "the charge, but in other countries this measure has been blocked, not by customers, but by "
            "manufacturers of plastic bags.\n\n"
            "What\u2019s the alternative to the traditional plastic bag? I thought the answer was the bio-degradable plastic "
            "bag, but it seems not to be the case. Manufacturers and the major supermarkets claim that such bags "
            "degrade completely in under three years. However, research has shown that they do not degrade as "
            "efficiently as has been claimed. I was really taken aback by this! They need light and oxygen for the "
            "material to degrade, but in landfills both are in short supply. Another criticism has been that it is "
            "environmental madness to produce something requiring a lot of oil to make, only so that it can \u2018self-destruct\u2019.\n\n"
            "I\u2019d always considered paper and cloth bags as an ethical alternative to plastic bags. Again, my ideas have "
            "been challenged. Both paper and cloth bags require much more energy to make, and are said to pollute "
            "air and water more in manufacture. I\u2019ve used a cloth bag several times for shopping, and prided myself on "
            "protecting the environment. It seems I\u2019m wrong. A cloth bag would have to be used 130 times before its "
            "ecological impact was as low as a plastic bag in terms of energy. I guess I have no choice but to do "
            "another 90 shopping trips or more with my cloth bag! One packaging manufacturer said \u2018Plastic bags are "
            "more environmentally friendly than cotton bags,\u2019 but I\u2019m not convinced. How can something that causes "
            "so much damage be acceptable?"
        ),
        "mcqs": [
            {"question": "Who invented the lightweight plastic shopping bag?",
             "options": ["An American businessman in the 1980s", "Swedish engineer Sten Gustaf Thulin", "A Chinese manufacturer", "An Irish supermarket owner"], "correct": 1},
            {"question": "Why did China ban non-biodegradable plastic bags?",
             "options": ["To save oil", "To protect camels", "To reduce litter on beaches", "To support local manufacturers"], "correct": 0},
            {"question": "Why don't biodegradable plastic bags break down as well as manufacturers claim?",
             "options": ["They are buried too deep to be found", "They need light and oxygen, which are scarce in landfills", "They are made from too much plastic", "They are mixed with cloth bags"], "correct": 1},
            {"question": "How many times must a cloth bag be used before its impact is as low as a plastic bag's?",
             "options": ["30 times", "90 times", "130 times", "200 times"], "correct": 2},
            {"question": "What was the result of Ireland's 'bag tax'?",
             "options": ["It was successful and customers accepted it", "It was blocked by customers", "It had no effect on bag use", "It was cancelled after a year"], "correct": 0},
        ],
    },

    "b2p1_santiago_detailed": {
        "title": "Cycling in Santiago",
        "level": "B2",
        "format": "detailed",
        "metrics": {"words": 498, "difficult": 40, "difficult_pct": 8.0,
                    "sentences": 27, "avg_len": 18.4},
        "body": (
            "Santiago is the capital city of Chile, in South America. It is home to 7 million people, and there are over 4 "
            "million vehicles on its busy streets. In 2017, a study was done of 390 cities around the world to find which "
            "had the worst traffic jams, and Santiago was ranked 10th on the list. So you might not think it would be a "
            "great place for cycling. However, there has been an enormous increase in the popularity of cycling in the "
            "city. The number of cyclists has been rising by at least 15% every year recently. In 2006, only about 3% "
            "of journeys in the city were made by bike, but by 2016 that had doubled to 6%.\n\n"
            "This increase is largely due to the efforts of one man. Gonzalo Stierling Aguayo is the founder of a project "
            "to get the people of Santiago cycling more. He persuaded the city\u2019s leaders to ban motor vehicles from "
            "the main roads of the city once a week. This means that every Sunday until 2pm the centre of the city "
            "becomes a 40-kilometre-long cycle path. About 40,000 people use the roads to cycle, roller skate, "
            "skateboard or just walk around the city, free from traffic.\n\n"
            "Gonzalo got the idea from a similar project already in place in Bogota, Colombia. The Santiago city "
            "leaders refused to give any money to the project, so it relies completely on sponsorship from local "
            "businesses. At first just a few roads were closed, but now seven areas of the city participate. Despite "
            "some initial opposition from drivers, most people think the project has made an enormous improvement to "
            "the city. Many other South American countries, including Mexico, Venezuela and Peru, have been "
            "inspired by its success to start something similar.\n\n"
            "The project transforms Santiago. It not only gives people more opportunity to exercise, but also "
            "encourages them to explore the city and mix more with their neighbours. According to Gonzalo, this is the "
            "greatest benefit of the project. Santiago is a city where people tend to stay in their own part of town and "
            "not have much contact with people in other areas, but cycling has changed this and helped to break down "
            "some of the social barriers. This is particularly noticeable in Parque Metropolitano, the largest urban park "
            "in South America. Previously, it was mostly used by people living near it in the city centre, but many now "
            "cycle there from the outskirts of the city.\n\n"
            "Gonzalo and his team plan to continue expanding the project and eventually to have the whole of the city "
            "closed to motor vehicle traffic on Sunday mornings. His dream is that there will be a vehicle-free route "
            "from the far north of the city through to the south. He also hopes to have an impact on weekday traffic by "
            "encouraging people to use their cycles to get to work. He believes more people should use cycles, not "
            "just for recreation, but as an everyday form of transport."
        ),
        "mcqs": [
            {"question": "What does the text say about traffic in Santiago?",
             "options": ["It was ranked among the worst cities in the world for traffic jams", "It has no traffic problems at all", "Traffic is banned there every day", "It has the best traffic in South America"], "correct": 0},
            {"question": "How did cycling in the city change between 2006 and 2016?",
             "options": ["It fell by half", "It doubled, from about 3% to 6% of journeys", "It stayed exactly the same", "It disappeared completely"], "correct": 1},
            {"question": "What did Gonzalo persuade the city leaders to do?",
             "options": ["Build new car parks", "Ban motor vehicles from the roads on Sundays so the city becomes a cycle path", "Lower bus fares", "Widen the motorways"], "correct": 1},
            {"question": "How is the cycling project funded?",
             "options": ["By the city government", "By a tax on cars", "By sponsorship from local businesses", "By selling tickets"], "correct": 2},
            {"question": "According to the text, what social benefit does the project bring?",
             "options": ["It makes people richer", "It increases car ownership", "It reduces the city's population", "It helps break down social barriers between different areas"], "correct": 3},
        ],
    },

    # ===== B2 — Pair 1 — SKIMMED arm (Skimmed-text group reads these) =========
    # NOTE: Santiago also appears (detailed) in this pair's detailed arm above.
    "b2p1_santiago_skimmed": {
        "title": "Cycling in Santiago",
        "level": "B2",
        "format": "skimmed",
        "metrics": {"words": 270, "difficult": 26, "difficult_pct": 9.6,
                    "sentences": 27, "avg_len": 10.0},
        "body": (
            "Santiago is the capital It is home to 7 million people, and there are over 4 million vehicles a study of "
            "390 cities to find which had the worst traffic jams, and Santiago ranked 10th you might not think it "
            "would be a great place for cycling. increase in popularity of cycling number of cyclists has been rising "
            "3% of journeys were made by bike, but doubled to 6%.\n\n"
            "This increase is due to the efforts of one man. Gonzalo Stierling Aguayo is the founder of a project to "
            "get people cycling He persuaded leaders to ban motor vehicles from roads every Sunday the city "
            "becomes a cycle path. 40,000 people use the roads to cycle, skate, or walk\n\n"
            "Gonzalo got the idea Santiago leaders refused money to the project, so it relies on sponsorship few "
            "roads closed, but seven areas participate. most people think the project has made an improvement to "
            "the city. Many South American countries, have been inspired to start something\n\n"
            "project transforms Santiago. It gives people more opportunity to exercise, but also encourages them "
            "to explore the city and mix with neighbours. this is the benefit of the project. Santiago is a city where "
            "people stay in their part of town and not have much contact but cycling has changed this and helped "
            "break down barriers. This is noticeable many now cycle from the outskirts\n\n"
            "Gonzalo and his team plan to continue expanding the project and have the city closed to traffic His "
            "dream is a vehicle-free route He hopes to impact traffic by encouraging people to use cycles He "
            "believes more people should use cycles,"
        ),
        "mcqs": [
            {"question": "What does the text say about traffic in Santiago?",
             "options": ["It was ranked among the worst cities in the world for traffic jams", "It has no traffic problems at all", "Traffic is banned there every day", "It has the best traffic in South America"], "correct": 0},
            {"question": "How did cycling in the city change between 2006 and 2016?",
             "options": ["It fell by half", "It doubled, from about 3% to 6% of journeys", "It stayed exactly the same", "It disappeared completely"], "correct": 1},
            {"question": "What did Gonzalo persuade the city leaders to do?",
             "options": ["Build new car parks", "Ban motor vehicles from the roads on Sundays so the city becomes a cycle path", "Lower bus fares", "Widen the motorways"], "correct": 1},
            {"question": "How is the cycling project funded?",
             "options": ["By the city government", "By a tax on cars", "By sponsorship from local businesses", "By selling tickets"], "correct": 2},
            {"question": "According to the text, what social benefit does the project bring?",
             "options": ["It makes people richer", "It increases car ownership", "It reduces the city's population", "It helps break down social barriers between different areas"], "correct": 3},
        ],
    },

    "b2p1_numeracy": {
        "title": "National Numeracy",
        "level": "B2",
        "format": "skimmed",
        "metrics": {"words": 225, "difficult": 25, "difficult_pct": 11.1,
                    "sentences": 18, "avg_len": 12.5},
        "body": (
            "National Numeracy claims millions of adults have poor mathematical skills These include "
            "understanding timetables, pay slips, bills and checking change The charity is keen to argue against "
            "the myth that maths is boring and not important NN, could be further from truth. poor numeracy skills "
            "cost billions\n\n"
            "poor numeracy skills contribute to disadvantage to individuals unable to carry out tasks, but they can "
            "be linked to other ills. People are more likely to be unemployed, suffer from depression and suffer "
            "from circumstances it pays to possess numeracy skills\n\n"
            "adult literacy has been improving, adult numeracy has got worse. many people don\u2019t like maths and "
            "don\u2019t see any point to it. maths isn\u2019t cool. It\u2019s OK to say \u2018I\u2019m no good at maths\u2019 whilst there is "
            "reluctance to admitting to being unable to read. maths is another school subject for which there is no "
            "need to make effort because you won\u2019t need it once you leave school.\n\n"
            "the problem seems to be passed down Parents who tell children they were no good at maths are "
            "likely to find the same attitude amongst children and will be unable to help with homework. maths is "
            "one of those subjects kids hate.\n\n"
            "it\u2019s the way it\u2019s taught in schools, the way teachers are trained or the failure to attract gifted teachers "
            "present maths as a way of solving problems"
        ),
        "mcqs": [
            {"question": "What does the charity National Numeracy claim?",
             "options": ["Most adults are excellent at maths", "Millions of adults have poor maths skills", "Maths is unimportant in daily life", "Schools teach maths too well"], "correct": 1},
            {"question": "Which everyday tasks does the text say poor numeracy affects?",
             "options": ["Writing emails", "Understanding timetables, bills and checking change", "Driving a car", "Cooking meals"], "correct": 1},
            {"question": "How has adult numeracy changed compared with adult literacy?",
             "options": ["Both have improved", "Both have got worse", "Literacy has improved but numeracy has got worse", "Numeracy has improved but literacy has got worse"], "correct": 2},
            {"question": "What social attitude about maths does the text describe?",
             "options": ["People are proud of being bad at reading", "It is socially acceptable to admit being bad at maths, unlike admitting you can't read", "Everyone loves maths", "People hide that they are good at maths"], "correct": 1},
            {"question": "Why does the text say the problem is passed down the generations?",
             "options": ["Schools refuse to teach maths", "Children are born bad at maths", "Parents pass on a negative attitude and cannot help with homework", "The government bans maths"], "correct": 2},
        ],
    },

}

# =============================================================================
# PAIRS  —  pairing is per-arm. assign() picks the participant's format group,
# draws that group's tuple, then counterbalances which text gets WordAhead and
# reading order. Each tuple's two texts are matched within their own arm.
# =============================================================================
PAIRS = {
    "b1_pair1": {
        "level": "B1",
        "detailed": ("b1p1_underground", "b1p1_seth"),          # Full-text group
        "skimmed":  ("b1p1_digital_habits", "b1p1_innovation"), # Skimmed-text group
    },
    "b2_pair1": {
        "level": "B2",
        "detailed": ("b2p1_plasticbags", "b2p1_santiago_detailed"),  # Full-text group
        "skimmed":  ("b2p1_santiago_skimmed", "b2p1_numeracy"),      # Skimmed-text group
    },
    # b1_pair2, b2_pair2 -> to follow, one at a time
}