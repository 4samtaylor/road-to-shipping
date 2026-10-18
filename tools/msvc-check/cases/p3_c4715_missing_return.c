/* expect: C4715 */
int f(int x) { if (x) return 1; }
int main(void) { return f(1); }
