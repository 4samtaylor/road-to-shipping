/* expect: C2088 */
typedef struct { int hp; } P;
int main(void) { P a = {0}, b = {0}; if (a == b) return 1; return 0; }
