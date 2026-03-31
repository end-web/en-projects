import { createRouter, createWebHistory } from "vue-router";
import PracticeView from "../views/PracticeView.vue";

const router = createRouter({
  // Important for GitHub Pages project sites (e.g. /en-projects/).
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "practice",
      component: PracticeView
    }
  ]
});

export default router;
