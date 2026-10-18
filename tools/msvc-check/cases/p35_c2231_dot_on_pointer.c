/* expect: C2231 */
typedef struct { int hp; } P;
int main(void) { P s = {0}; P* p = &s; p.hp = 1; return 0; }
