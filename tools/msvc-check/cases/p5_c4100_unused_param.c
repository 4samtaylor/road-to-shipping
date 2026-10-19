/* expect: C4100 */
int f(int unused) { return 0; }
int main(void) { return f(1); }
