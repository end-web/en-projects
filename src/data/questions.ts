import type { Question, QuestionTemplate } from "../types/practice";

type Difficulty = 1 | 2 | 3 | 4 | 5;

const courseBank: Record<number, Record<Difficulty, QuestionTemplate[]>> = {
  1: {
    1: [
      { zh: "我喜欢苹果", en: "I like apples" },
      { zh: "这个香蕉很甜", en: "This banana is sweet" },
      { zh: "她买了两个梨", en: "She bought two pears" },
      { zh: "我想吃橙子", en: "I want to eat oranges" }
    ],
    2: [
      { zh: "我们今天做水果沙拉", en: "We make fruit salad today" },
      { zh: "葡萄在桌子上", en: "The grapes are on the table" },
      { zh: "草莓的颜色很漂亮", en: "The strawberries look beautiful" },
      { zh: "他每天喝苹果汁", en: "He drinks apple juice every day" }
    ],
    3: [
      { zh: "这个芒果闻起来很香", en: "This mango smells very good" },
      { zh: "我更喜欢新鲜水果", en: "I prefer fresh fruit" },
      { zh: "请给我一片西瓜", en: "Please give me a slice of watermelon" },
      { zh: "她把蓝莓放进酸奶里", en: "She puts blueberries into yogurt" }
    ],
    4: [
      { zh: "我们周末去市场买水果", en: "We go to the market for fruit on weekends" },
      { zh: "菠萝和橙子都很受欢迎", en: "Pineapples and oranges are both popular" },
      { zh: "水果能帮助你保持健康", en: "Fruit helps you stay healthy" },
      { zh: "这个桃子比那个更甜", en: "This peach is sweeter than that one" }
    ],
    5: [
      { zh: "如果你多吃水果你会更有活力", en: "If you eat more fruit you will have more energy" },
      { zh: "她准备了一个包含五种水果的拼盘", en: "She prepared a platter with five kinds of fruit" },
      { zh: "医生建议我们每天都吃新鲜水果", en: "The doctor suggests that we eat fresh fruit every day" },
      { zh: "我发现饭后吃水果让我感觉更好", en: "I find that eating fruit after meals makes me feel better" }
    ]
  },
  2: {
    1: [
      { zh: "那只狗很可爱", en: "That dog is cute" },
      { zh: "猫在沙发上睡觉", en: "The cat sleeps on the sofa" },
      { zh: "兔子喜欢胡萝卜", en: "Rabbits like carrots" },
      { zh: "我看到一只鸟", en: "I see a bird" }
    ],
    2: [
      { zh: "狮子住在草原上", en: "Lions live on grasslands" },
      { zh: "海豚非常聪明", en: "Dolphins are very smart" },
      { zh: "熊猫吃很多竹子", en: "Pandas eat a lot of bamboo" },
      { zh: "老虎跑得很快", en: "Tigers run very fast" }
    ],
    3: [
      { zh: "我们在动物园看到了长颈鹿", en: "We saw a giraffe at the zoo" },
      { zh: "小猫喜欢追逐小球", en: "The kitten likes chasing small balls" },
      { zh: "那只猴子正在树上跳跃", en: "That monkey is jumping in the tree" },
      { zh: "海龟可以在海里游很远", en: "Sea turtles can swim very far in the ocean" }
    ],
    4: [
      { zh: "很多孩子都想摸那只温顺的小羊", en: "Many children want to touch that gentle lamb" },
      { zh: "我们应该保护野生动物的家园", en: "We should protect the homes of wild animals" },
      { zh: "那只鹰在山谷上空盘旋", en: "The eagle circles above the valley" },
      { zh: "如果天气变冷候鸟就会南飞", en: "If the weather gets cold migratory birds fly south" }
    ],
    5: [
      { zh: "科学家正在研究如何拯救濒危动物", en: "Scientists are studying how to save endangered animals" },
      { zh: "我认为每个人都应该尊重动物的生命", en: "I think everyone should respect animal life" },
      { zh: "我们参观了一个专门照顾受伤动物的中心", en: "We visited a center that cares for injured animals" },
      { zh: "通过纪录片我学到了很多动物行为知识", en: "Through documentaries I learned a lot about animal behavior" }
    ]
  },
  3: {
    1: [
      { zh: "我今天头疼", en: "I have a headache today" },
      { zh: "她的眼睛很漂亮", en: "Her eyes are beautiful" },
      { zh: "我的手有点冷", en: "My hands are a little cold" },
      { zh: "请抬起你的左腿", en: "Please raise your left leg" }
    ],
    2: [
      { zh: "他的肩膀有点酸", en: "His shoulders feel sore" },
      { zh: "我跑步后膝盖疼", en: "My knees hurt after running" },
      { zh: "请张开嘴巴", en: "Please open your mouth" },
      { zh: "她深呼吸了一次", en: "She took a deep breath" }
    ],
    3: [
      { zh: "医生让我多活动背部", en: "The doctor asked me to move my back more" },
      { zh: "我昨天扭到了脚踝", en: "I twisted my ankle yesterday" },
      { zh: "请把双手放在头后面", en: "Please put both hands behind your head" },
      { zh: "运动前你应该拉伸肌肉", en: "You should stretch your muscles before exercise" }
    ],
    4: [
      { zh: "她上楼时感觉胸口有些不舒服", en: "She felt discomfort in her chest when climbing stairs" },
      { zh: "长时间看屏幕会让眼睛疲劳", en: "Looking at screens for long hours makes your eyes tired" },
      { zh: "保持正确坐姿可以保护脊椎", en: "Keeping proper posture helps protect your spine" },
      { zh: "我每天都会做颈部放松训练", en: "I do neck relaxation exercises every day" }
    ],
    5: [
      { zh: "如果你睡眠不足身体恢复会变慢", en: "If you do not sleep enough your body recovers more slowly" },
      { zh: "健康饮食和运动对心脏非常重要", en: "Healthy eating and exercise are very important for the heart" },
      { zh: "她在康复期间每天记录身体变化", en: "She records physical changes every day during recovery" },
      { zh: "医生建议我每隔一小时起身活动一下", en: "The doctor advised me to stand up and move every hour" }
    ]
  },
  4: {
    1: [
      { zh: "我在教室里学习", en: "I study in the classroom" },
      { zh: "她带了新铅笔", en: "She brought a new pencil" },
      { zh: "今天有数学课", en: "We have math class today" },
      { zh: "老师正在点名", en: "The teacher is calling names" }
    ],
    2: [
      { zh: "我们放学后去图书馆", en: "We go to the library after school" },
      { zh: "他忘了带作业本", en: "He forgot to bring his workbook" },
      { zh: "下周有一次英语测验", en: "There is an English test next week" },
      { zh: "校长今天来班里讲话", en: "The principal visited our class today" }
    ],
    3: [
      { zh: "我需要在周五前提交报告", en: "I need to submit the report before Friday" },
      { zh: "我们小组在讨论科学项目", en: "Our group is discussing the science project" },
      { zh: "她总是认真整理课堂笔记", en: "She always organizes her class notes carefully" },
      { zh: "这次考试比上次更难", en: "This exam is harder than the last one" }
    ],
    4: [
      { zh: "老师建议我们每天复习二十分钟", en: "The teacher suggests that we review for twenty minutes every day" },
      { zh: "图书馆里有很多适合初学者的英语书", en: "There are many English books for beginners in the library" },
      { zh: "如果你有问题可以课后来办公室找我", en: "If you have questions you can come to my office after class" },
      { zh: "班长负责收集并检查每个人的作业", en: "The class monitor collects and checks everyones homework" }
    ],
    5: [
      { zh: "为了准备期末考试我们制定了详细计划", en: "To prepare for final exams we made a detailed study plan" },
      { zh: "她通过主动提问提高了课堂参与度", en: "She improved class participation by asking questions actively" },
      { zh: "我们在演讲比赛中展示了团队合作能力", en: "We showed our teamwork skills in the speech contest" },
      { zh: "持续练习让我的写作表达更加自然", en: "Consistent practice makes my writing expression more natural" }
    ]
  },
  5: {
    1: [
      { zh: "我每天六点起床", en: "I get up at six every day" },
      { zh: "她晚上会散步", en: "She takes a walk at night" },
      { zh: "我们周末一起做饭", en: "We cook together on weekends" },
      { zh: "他喜欢听音乐", en: "He likes listening to music" }
    ],
    2: [
      { zh: "我下班后去超市买菜", en: "I go to the supermarket after work" },
      { zh: "她今天想在家休息", en: "She wants to rest at home today" },
      { zh: "我们计划明天去爬山", en: "We plan to go hiking tomorrow" },
      { zh: "晚上我会给朋友打电话", en: "I will call my friend in the evening" }
    ],
    3: [
      { zh: "我通常在早餐前读十分钟英语", en: "I usually read English for ten minutes before breakfast" },
      { zh: "如果下雨我们就改去看电影", en: "If it rains we will go to the movies instead" },
      { zh: "她把今天的任务写进了清单", en: "She wrote todays tasks on a checklist" },
      { zh: "我想把房间整理得更干净", en: "I want to keep my room cleaner" }
    ],
    4: [
      { zh: "为了节省时间我提前准备了午餐", en: "To save time I prepared lunch in advance" },
      { zh: "我们决定每周安排一次家庭活动", en: "We decided to schedule one family activity each week" },
      { zh: "他每天睡前都会回顾当天计划", en: "He reviews his daily plan before going to bed" },
      { zh: "保持规律作息让我更有精神", en: "Keeping a regular routine gives me more energy" }
    ],
    5: [
      { zh: "当我专注于重要事情时效率明显提高", en: "When I focus on important tasks my efficiency improves a lot" },
      { zh: "我通过记录习惯来追踪自己的进步", en: "I track my progress by recording my habits" },
      { zh: "长期坚持小目标会带来很大的变化", en: "Sticking to small goals for a long time brings big changes" },
      { zh: "我学会了在忙碌生活中保持平衡", en: "I learned to keep balance in a busy life" }
    ]
  }
};

function buildQuestions(): Question[] {
  const result: Question[] = [];
  let counter = 1;
  const difficulties: Difficulty[] = [1, 2, 3, 4, 5];

  for (let course = 1; course <= 5; course += 1) {
    for (const difficulty of difficulties) {
      const items = courseBank[course][difficulty];
      for (const item of items) {
        result.push({
          id: `q-${counter}`,
          course,
          difficulty,
          zh: item.zh,
          en: item.en
        });
        counter += 1;
      }
    }
  }

  return result;
}

export const questions: Question[] = buildQuestions();
