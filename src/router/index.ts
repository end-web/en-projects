import { createRouter, createWebHistory } from "vue-router";
import PracticeView from "../views/PracticeView.vue";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "practice",
      component: PracticeView
    }
  ]
});

export default router;
