/* expect: C4102 */
int main(void) { int k = 2; switch (k) { case 1: break; defualt: break; } return 0; }
