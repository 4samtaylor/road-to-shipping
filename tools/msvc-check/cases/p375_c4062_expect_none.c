/* expect: none */
typedef enum { A, B, C } E;
int f(E e) { switch (e) { case A: return 1; case B: return 2; } return 0; }
int main(void) { return f(A); }
