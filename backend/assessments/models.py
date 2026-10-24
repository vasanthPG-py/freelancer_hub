"""
AI Skill Assessment Models
Handles server-side question generation, timed exam sessions,
server-graded answer evaluation, and verification status updates.
"""
import json
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


# Built-in question bank used when AI provider is unavailable
FALLBACK_QUESTIONS = {
    'python': [
        {
            'q': 'What is a Python generator and how does it differ from a regular function?',
            'a': 'generator',
            'keywords': ['yield', 'lazy evaluation', 'iterator', 'memory efficient', 'generator function']
        },
        {
            'q': 'Explain the difference between `__str__` and `__repr__` in Python.',
            'a': 'repr',
            'keywords': ['str human readable', 'repr unambiguous', 'debugging', 'developer', 'print']
        },
        {
            'q': 'What are Python decorators? Give a real-world use case.',
            'a': 'decorator',
            'keywords': ['wrapper', 'function', '@', 'modify behavior', 'logging', 'authentication', 'caching']
        },
        {
            'q': 'Explain the GIL (Global Interpreter Lock) and its implications.',
            'a': 'gil',
            'keywords': ['thread', 'CPython', 'mutex', 'parallel', 'multiprocessing', 'I/O bound', 'CPU bound']
        },
        {
            'q': 'How does Python handle memory management and garbage collection?',
            'a': 'memory',
            'keywords': ['reference counting', 'garbage collector', 'cyclic', 'del', 'gc module', 'heap']
        },
        {
            'q': 'What are context managers in Python and how do you create one?',
            'a': 'context',
            'keywords': ['with statement', '__enter__', '__exit__', 'contextlib', 'resource management', 'file']
        },
        {
            'q': 'Explain list comprehensions vs generator expressions in Python.',
            'a': 'comprehension',
            'keywords': ['memory', 'lazy', 'square brackets', 'parentheses', 'iteration', 'one-liner']
        },
        {
            'q': 'What is the difference between shallow copy and deep copy?',
            'a': 'copy',
            'keywords': ['copy.copy', 'copy.deepcopy', 'nested', 'reference', 'independent']
        },
        {
            'q': 'How do you handle exceptions in Python? What is the difference between `except Exception` and `except BaseException`?',
            'a': 'exception',
            'keywords': ['try', 'except', 'finally', 'raise', 'BaseException', 'SystemExit', 'KeyboardInterrupt']
        },
        {
            'q': 'What are Python metaclasses?',
            'a': 'metaclass',
            'keywords': ['class of a class', 'type', '__new__', '__init__', 'ORM', 'Django']
        },
    ],
    'javascript': [
        {
            'q': 'Explain the event loop in JavaScript and how asynchronous code works.',
            'a': 'event loop',
            'keywords': ['call stack', 'task queue', 'microtask', 'promise', 'setTimeout', 'non-blocking']
        },
        {
            'q': 'What is closure in JavaScript? Provide a practical example.',
            'a': 'closure',
            'keywords': ['inner function', 'outer scope', 'lexical environment', 'data privacy', 'counter']
        },
        {
            'q': 'Explain the difference between `var`, `let`, and `const`.',
            'a': 'scope',
            'keywords': ['hoisting', 'block scope', 'function scope', 'reassign', 'temporal dead zone']
        },
        {
            'q': 'What are Promises and how do async/await relate to them?',
            'a': 'promise',
            'keywords': ['resolve', 'reject', 'then', 'catch', 'async', 'await', 'syntactic sugar']
        },
        {
            'q': 'Explain prototypal inheritance in JavaScript.',
            'a': 'prototype',
            'keywords': ['__proto__', 'prototype chain', 'Object.create', 'constructor', 'class']
        },
        {
            'q': 'What is the difference between `==` and `===` in JavaScript?',
            'a': 'strict equality',
            'keywords': ['type coercion', 'strict', 'loose', 'comparison', 'NaN']
        },
        {
            'q': 'What are higher-order functions? Name three built-in examples.',
            'a': 'higher order',
            'keywords': ['map', 'filter', 'reduce', 'function as argument', 'returns function']
        },
        {
            'q': 'Explain the concept of `this` in JavaScript.',
            'a': 'this',
            'keywords': ['context', 'call', 'apply', 'bind', 'arrow function', 'global', 'method']
        },
        {
            'q': 'What is debouncing and throttling in JavaScript?',
            'a': 'debounce',
            'keywords': ['performance', 'rate limit', 'delay', 'scroll', 'resize', 'input', 'lodash']
        },
        {
            'q': 'What are JavaScript modules (ESM) and how do they differ from CommonJS?',
            'a': 'modules',
            'keywords': ['import', 'export', 'require', 'default export', 'named export', 'static', 'dynamic']
        },
    ],
    'react': [
        {
            'q': 'Explain the React component lifecycle (hooks era).',
            'a': 'lifecycle',
            'keywords': ['useEffect', 'mount', 'unmount', 'update', 'cleanup', 'dependency array']
        },
        {
            'q': 'What is the virtual DOM and how does React\'s reconciliation algorithm work?',
            'a': 'virtual dom',
            'keywords': ['diffing', 'fiber', 'reconciliation', 'key', 'actual DOM', 'efficient updates']
        },
        {
            'q': 'Explain useState vs useReducer. When would you use each?',
            'a': 'state',
            'keywords': ['simple state', 'complex state', 'dispatch', 'action', 'reducer', 'multiple sub-values']
        },
        {
            'q': 'What are React custom hooks and why are they useful?',
            'a': 'custom hook',
            'keywords': ['reusability', 'logic extraction', 'usePrefix', 'separation of concerns', 'composition']
        },
        {
            'q': 'What is memoization in React? Explain useMemo and useCallback.',
            'a': 'memoization',
            'keywords': ['performance', 'prevent re-render', 'expensive calculation', 'reference equality', 'React.memo']
        },
        {
            'q': 'Explain React Context API and when you should use it vs a state management library.',
            'a': 'context',
            'keywords': ['global state', 'prop drilling', 'Provider', 'Consumer', 'useContext', 'Redux']
        },
        {
            'q': 'What are controlled vs uncontrolled components in React?',
            'a': 'controlled',
            'keywords': ['form', 'value', 'onChange', 'ref', 'defaultValue', 'DOM managed']
        },
        {
            'q': 'Explain React\'s Concurrent Mode and what problems it solves.',
            'a': 'concurrent',
            'keywords': ['time-slicing', 'Suspense', 'priority', 'interruptible', 'React 18', 'useTransition']
        },
        {
            'q': 'What are React Server Components? How do they differ from Client Components?',
            'a': 'server component',
            'keywords': ['server-side', 'no state', 'no hooks', 'bundle size', 'Next.js', 'data fetching']
        },
        {
            'q': 'How would you optimize a React application that renders a list of 10,000 items?',
            'a': 'virtualization',
            'keywords': ['windowing', 'react-window', 'react-virtualized', 'pagination', 'lazy loading', 'key']
        },
    ],
    'django': [
        {
            'q': 'Explain Django\'s ORM query optimization techniques.',
            'a': 'select_related',
            'keywords': ['select_related', 'prefetch_related', 'N+1', 'annotate', 'aggregate', 'only', 'defer']
        },
        {
            'q': 'What is Django middleware and how does request/response processing work?',
            'a': 'middleware',
            'keywords': ['process_request', 'process_response', 'chain', 'MIDDLEWARE', 'order', 'hook']
        },
        {
            'q': 'Explain Django signals and provide a use case.',
            'a': 'signals',
            'keywords': ['post_save', 'pre_save', 'receiver', 'sender', 'decoupled', 'user creation']
        },
        {
            'q': 'What is Django\'s `select_related` vs `prefetch_related`?',
            'a': 'joins',
            'keywords': ['SQL JOIN', 'forward', 'reverse', 'ForeignKey', 'ManyToMany', 'separate query']
        },
        {
            'q': 'How does Django handle database migrations?',
            'a': 'migrations',
            'keywords': ['makemigrations', 'migrate', 'schema', 'squash', 'dependencies', 'state']
        },
        {
            'q': 'Explain Django\'s authentication system and how to customize it.',
            'a': 'authentication',
            'keywords': ['AbstractUser', 'AbstractBaseUser', 'AUTH_USER_MODEL', 'backend', 'permission']
        },
        {
            'q': 'What are Django class-based views (CBV) vs function-based views (FBV)?',
            'a': 'views',
            'keywords': ['reusability', 'mixins', 'dispatch', 'get', 'post', 'as_view', 'inheritance']
        },
        {
            'q': 'How does Django REST Framework handle serialization?',
            'a': 'serializer',
            'keywords': ['validate', 'create', 'update', 'fields', 'nested', 'ModelSerializer']
        },
        {
            'q': 'Explain Django\'s caching framework.',
            'a': 'caching',
            'keywords': ['cache_page', 'cache.get', 'cache.set', 'memcached', 'redis', 'backend', 'invalidation']
        },
        {
            'q': 'What is CSRF protection in Django and how does it work?',
            'a': 'csrf',
            'keywords': ['token', 'cookie', 'middleware', 'POST', 'exempt', 'SameSite', 'form']
        },
    ],
    'general': [
        {
            'q': 'Explain the SOLID principles of software design.',
            'a': 'solid',
            'keywords': ['single responsibility', 'open closed', 'liskov', 'interface segregation', 'dependency inversion']
        },
        {
            'q': 'What is the difference between REST and GraphQL APIs?',
            'a': 'rest graphql',
            'keywords': ['over-fetching', 'under-fetching', 'schema', 'query', 'mutation', 'multiple endpoints']
        },
        {
            'q': 'Explain microservices architecture vs monolithic architecture.',
            'a': 'microservices',
            'keywords': ['independent deployment', 'scalability', 'service communication', 'complexity', 'distributed']
        },
        {
            'q': 'What is Docker and how does containerization work?',
            'a': 'docker',
            'keywords': ['container', 'image', 'Dockerfile', 'isolation', 'layer', 'registry', 'compose']
        },
        {
            'q': 'Explain SQL vs NoSQL databases. When would you choose each?',
            'a': 'sql nosql',
            'keywords': ['relational', 'schema', 'ACID', 'horizontal scaling', 'document', 'MongoDB', 'consistency']
        },
    ]
}


class Assessment(models.Model):
    """
    A server-side AI skill assessment session for a freelancer.
    Contains generated questions, timing, and the final verified score.
    """
    class Status(models.TextChoices):
        PENDING = 'PENDING', _('Pending Start')
        IN_PROGRESS = 'IN_PROGRESS', _('In Progress')
        SUBMITTED = 'SUBMITTED', _('Submitted for Grading')
        GRADED = 'GRADED', _('Graded')
        EXPIRED = 'EXPIRED', _('Time Expired')

    freelancer = models.ForeignKey(
        'profiles.FreelancerProfile',
        on_delete=models.CASCADE,
        related_name='assessments'
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True
    )
    # JSON field storing list of question objects: [{id, question_text, category, keywords}]
    questions = models.JSONField(
        default=list,
        help_text=_("Server-generated questions. Answers/keywords are NEVER sent to the frontend.")
    )
    # JSON field storing freelancer's submitted answers: {question_id: answer_text}
    answers = models.JSONField(
        default=dict,
        blank=True
    )
    # Score computed server-side only
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    passing_score = models.DecimalField(max_digits=5, decimal_places=2, default=60.00)
    total_questions = models.IntegerField(default=10)
    correct_answers = models.IntegerField(null=True, blank=True)

    # Time management
    duration_minutes = models.IntegerField(default=30)
    started_at = models.DateTimeField(null=True, blank=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    # Context: which skills prompted this assessment
    assessed_skills = models.ManyToManyField(
        'profiles.Skill',
        blank=True,
        related_name='assessments'
    )
    ai_generated = models.BooleanField(default=False, help_text=_("True if questions were generated by the AI API."))

    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = _('Assessment')
        verbose_name_plural = _('Assessments')

    def __str__(self):
        return f"Assessment for {self.freelancer.user.email} [{self.status}] Score: {self.score}"

    @property
    def is_expired(self):
        if self.expires_at and self.status == self.Status.IN_PROGRESS:
            return timezone.now() > self.expires_at
        return False

    @property
    def time_remaining_seconds(self):
        if self.expires_at and self.status == self.Status.IN_PROGRESS:
            remaining = (self.expires_at - timezone.now()).total_seconds()
            return max(0, int(remaining))
        return 0

    def get_questions_for_frontend(self):
        """Returns questions without answer keys or keywords - safe to send to client."""
        return [
            {
                'id': i,
                'question_text': q.get('q', q.get('question_text', '')),
                'category': q.get('category', 'general'),
            }
            for i, q in enumerate(self.questions)
        ]

    def grade(self):
        """Server-side grading: keyword matching against submitted answers."""
        from decimal import Decimal

        total = len(self.questions)
        if total == 0:
            self.score = Decimal('0.00')
            self.correct_answers = 0
            return

        correct = 0
        for i, question in enumerate(self.questions):
            answer = self.answers.get(str(i), '').lower().strip()
            if not answer:
                continue
            keywords = [kw.lower() for kw in question.get('keywords', [])]
            if keywords:
                matched = sum(1 for kw in keywords if kw in answer)
                if matched >= max(1, len(keywords) // 3):
                    correct += 1

        self.correct_answers = correct
        self.score = Decimal(str(round((correct / total) * 100, 2)))
        self.status = self.Status.GRADED
        self.submitted_at = timezone.now()
        self.save()

        # Update freelancer verification if score passes
        if self.score >= self.passing_score:
            self.freelancer.user.is_verified = True
            self.freelancer.user.save(update_fields=['is_verified'])

        return self.score
