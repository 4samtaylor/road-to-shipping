/* expect: C4457 */
int f(int x) { { int x = 2; (void)x; } return x; }
int main(void) { return f(1); }
