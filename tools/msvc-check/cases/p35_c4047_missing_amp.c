/* expect: C4047 */
void heal(int* hp) { *hp += 1; }
int main(void) { int hp = 1; heal(hp); return hp; }
