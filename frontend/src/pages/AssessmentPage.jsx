import React, { useState, useEffect, useCallback, useRef } from 'react';
import Card from '../components/common/Card';
import Badge from '../components/common/Badge';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import { useAuth } from '../context/AuthContext';
import { useRouter } from '../context/RouterContext';
import { assessmentsAPI, profilesAPI } from '../services/api';

export default function AssessmentPage() {
  const { user, refreshUser } = useAuth();
  const { navigate } = useRouter();

  // Screen states: 'briefing' | 'in_progress' | 'grading' | 'results'
  const [stage, setStage] = useState('briefing');
  const [profile, setProfile] = useState(null);
  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [currentIndex, setCurrentIndex] = useState(0);

  // Timing
  const [timeLeft, setTimeLeft] = useState(1800); // 30 minutes in seconds
  const timerRef = useRef(null);

  // Result state
  const [result, setResult] = useState(null);

  // Loading & error
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // 1. Initial Load: Check for active assessment or load profile
  useEffect(() => {
    async function init() {
      setLoading(true);
      try {
        const [profData, activeData] = await Promise.all([
          profilesAPI.getFreelancerProfile().catch(() => null),
          assessmentsAPI.getActive().catch(() => ({ assessment: null })),
        ]);
        setProfile(profData);

        if (activeData?.assessment && activeData.assessment.status === 'IN_PROGRESS') {
          const act = activeData.assessment;
          setAssessment(act);
          const qList = act.questions_for_display || [];
          setQuestions(qList);
          setTimeLeft(act.time_remaining_seconds || 1800);
          setStage('in_progress');
        } else {
          setStage('briefing');
        }
      } catch (err) {
        setError(err.message || 'Failed to initialize assessment workspace.');
      } finally {
        setLoading(false);
      }
    }
    init();
  }, []);

  // 2. Countdown Timer
  useEffect(() => {
    if (stage === 'in_progress' && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(timerRef.current);
  }, [stage, timeLeft]);

  // 3. Start Assessment
  const handleStartAssessment = async () => {
    setError('');
    setLoading(true);
    try {
      const res = await assessmentsAPI.start();
      const newAssessment = res.assessment;
      setAssessment(newAssessment);
      const qList = newAssessment.questions_for_display || [];
      setQuestions(qList);
      setTimeLeft(newAssessment.time_remaining_seconds || 1800);
      setAnswers({});
      setCurrentIndex(0);
      setStage('in_progress');
    } catch (err) {
      if (err.status === 409 && err.data?.assessment) {
        // Resume existing active session
        const act = err.data.assessment;
        setAssessment(act);
        setQuestions(act.questions_for_display || []);
        setTimeLeft(act.time_remaining_seconds || 1800);
        setStage('in_progress');
      } else {
        setError(err.data?.error || err.message || 'Failed to start assessment.');
      }
    } finally {
      setLoading(false);
    }
  };

  // 4. Update Answer
  const handleAnswerChange = (val) => {
    setAnswers((prev) => ({
      ...prev,
      [String(currentIndex)]: val,
    }));
  };

  // 5. Submit Answers
  const handleSubmitAssessment = async () => {
    if (!window.confirm('Are you ready to submit your assessment for server-side evaluation?')) {
      return;
    }
    clearInterval(timerRef.current);
    setSubmitting(true);
    setError('');
    try {
      const res = await assessmentsAPI.submit(assessment.id, answers);
      setResult(res.result);
      setStage('results');
      if (refreshUser) refreshUser();
    } catch (err) {
      setError(err.data?.error || err.message || 'Submission failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAutoSubmit = async () => {
    setError('Time has expired! Automatically submitting your answers for evaluation...');
    try {
      const res = await assessmentsAPI.submit(assessment.id, answers);
      setResult(res.result);
      setStage('results');
      if (refreshUser) refreshUser();
    } catch {
      setStage('results');
    }
  };

  // Format timer MM:SS
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remSecs = secs % 60;
    return `${String(mins).padStart(2, '0')}:${String(remSecs).padStart(2, '0')}`;
  };

  if (loading) {
    return <Loader message="Connecting to AI Assessment Engine..." fullScreen />;
  }

  // ─── STAGE 1: BRIEFING SCREEN ────────────────────────────────────────────────
  if (stage === 'briefing') {
    return (
      <div style={{ padding: 'var(--space-2xl) 0' }}>
        <div className="content-wrapper" style={{ maxWidth: 820 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <Badge variant="primary" style={{ marginBottom: 'var(--space-xs)' }}>AI VERIFICATION SYSTEM</Badge>
            <h2>Technical Skill Verification Assessment</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Pass an automated 30-minute server-evaluated technical assessment to prove your proficiency and earn the AI-Verified badge.
            </p>
          </div>

          {error && <Alert type="error" onClose={() => setError('')} style={{ marginBottom: 'var(--space-lg)' }}>{error}</Alert>}

          <Card style={{ marginBottom: 'var(--space-xl)' }}>
            <div className="card-header">
              <h4>Candidate Evaluation Profile</h4>
              <Badge variant={user?.is_verified ? 'verified' : 'warning'}>
                {user?.is_verified ? 'Verified Expert' : 'Verification Required'}
              </Badge>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)', background: 'var(--bg-canvas)', padding: 'var(--space-md)', borderRadius: 'var(--radius-md)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Candidate:</span>
                <div style={{ fontWeight: 600 }}>{user?.full_name}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Professional Title:</span>
                <div style={{ fontWeight: 600 }}>{profile?.title || 'Senior Software Engineer'}</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Passing Score Threshold:</span>
                <div style={{ fontWeight: 700, color: 'var(--accent-400)' }}>60% or higher</div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Time Limit:</span>
                <div style={{ fontWeight: 700, color: '#38bdf8' }}>30 Minutes (Timed)</div>
              </div>
            </div>

            <div style={{ marginBottom: 'var(--space-md)' }}>
              <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#fff', marginBottom: 6 }}>
                Detected Skills Assessed:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {(profile?.skills_data && profile.skills_data.length > 0) ? (
                  profile.skills_data.map((sk) => (
                    <Badge key={sk.id} variant="primary">{sk.name}</Badge>
                  ))
                ) : (
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                    Core competencies: Python, Django, React, Modern Web Engineering.
                  </span>
                )}
              </div>
            </div>
          </Card>

          <Card style={{ marginBottom: 'var(--space-2xl)' }}>
            <h4 style={{ marginBottom: 'var(--space-md)', color: 'var(--primary-400)' }}>
              Examination Rules & Integrity Standards
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-sm)', color: 'var(--text-secondary)', fontSize: '0.92rem', lineHeight: 1.6 }}>
              <p>• <strong>Personalized Questions:</strong> 10 technical and scenario-based questions generated specifically from your skills and experience.</p>
              <p>• <strong>Strict Server-Side Grading:</strong> Correct answers and rubrics remain on the server. Your submitted answers are evaluated deterministically against structured keyword rubrics.</p>
              <p>• <strong>Enforced Countdown:</strong> Once started, the 30-minute timer runs continuously. If time expires, answers are automatically evaluated.</p>
              <p>• <strong>Verification Unlock:</strong> Achieving 60% or higher instantly marks your profile as <strong>AI-Verified</strong>, unlocking marketplace bidding privileges.</p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end', marginTop: 'var(--space-xl)' }}>
              <Button variant="secondary" onClick={() => navigate('/freelancer/dashboard')}>
                Back to Dashboard
              </Button>
              <Button variant="primary" size="lg" onClick={handleStartAssessment}>
                Begin Timed Assessment (30 Mins) →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ─── STAGE 2: ACTIVE TIMED ASSESSMENT ─────────────────────────────────────────
  if (stage === 'in_progress') {
    const currentQ = questions[currentIndex] || {};
    const answeredCount = Object.keys(answers).filter((k) => (answers[k] || '').trim().length > 0).length;
    const isUrgent = timeLeft < 300; // less than 5 minutes

    return (
      <div style={{ padding: 'var(--space-xl) 0' }}>
        <div className="content-wrapper" style={{ maxWidth: 900 }}>
          {/* Sticky Timer Header */}
          <div
            style={{
              position: 'sticky',
              top: 'var(--space-md)',
              zIndex: 30,
              background: 'var(--bg-surface)',
              border: `1px solid ${isUrgent ? 'var(--danger)' : 'var(--border-medium)'}`,
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-md) var(--space-lg)',
              marginBottom: 'var(--space-xl)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: 'var(--shadow-md)',
            }}
          >
            <div>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Skill Assessment Session</span>
              <div style={{ fontWeight: 700, fontSize: '1.05rem', color: '#fff' }}>
                Question {currentIndex + 1} of {questions.length}
              </div>
            </div>

            {/* Countdown Badge */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Time Remaining:</span>
                <div
                  style={{
                    fontSize: '1.4rem',
                    fontWeight: 800,
                    fontFamily: 'var(--font-mono)',
                    color: isUrgent ? 'var(--danger)' : 'var(--accent-400)',
                    animation: isUrgent ? 'pulse 1s infinite' : 'none',
                  }}
                >
                  ⏱ {formatTime(timeLeft)}
                </div>
              </div>

              <Button
                variant="accent"
                size="sm"
                onClick={handleSubmitAssessment}
                disabled={submitting}
              >
                {submitting ? 'Submitting...' : 'Finish & Submit'}
              </Button>
            </div>
          </div>

          {error && <Alert type="error" onClose={() => setError('')} style={{ marginBottom: 'var(--space-md)' }}>{error}</Alert>}

          {/* Question Palette */}
          <div style={{ marginBottom: 'var(--space-lg)', display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginRight: 6 }}>Navigation:</span>
            {questions.map((q, idx) => {
              const isCurrent = idx === currentIndex;
              const hasAnswer = (answers[String(idx)] || '').trim().length > 0;
              return (
                <button
                  type="button"
                  key={idx}
                  onClick={() => setCurrentIndex(idx)}
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 'var(--radius-md)',
                    border: isCurrent ? '2px solid var(--primary-400)' : '1px solid var(--border-subtle)',
                    background: isCurrent ? 'var(--primary-600)' : hasAnswer ? 'var(--bg-surface-elevated)' : 'var(--bg-canvas)',
                    color: isCurrent || hasAnswer ? '#fff' : 'var(--text-muted)',
                    fontWeight: isCurrent ? 700 : 500,
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                  }}
                >
                  {hasAnswer && !isCurrent ? '✓' : idx + 1}
                </button>
              );
            })}
            <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {answeredCount}/{questions.length} answered
            </span>
          </div>

          {/* Active Question Card */}
          <Card style={{ marginBottom: 'var(--space-xl)', minHeight: 320 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
              <Badge variant="primary">Topic: {currentQ.category || 'General Software Engineering'}</Badge>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Item #{currentIndex + 1}
              </span>
            </div>

            <h3 style={{ marginBottom: 'var(--space-lg)', color: 'var(--text-main)', lineHeight: 1.5 }}>
              {currentQ.question_text}
            </h3>

            <div className="form-group" style={{ marginBottom: 'var(--space-lg)' }}>
              <label className="form-label" style={{ fontSize: '0.85rem' }}>
                Your Technical Answer & Explanation:
              </label>
              <textarea
                className="form-input"
                rows={7}
                placeholder="Type your technical response here. Include principles, code snippets, architectural trade-offs, or methodologies..."
                value={answers[String(currentIndex)] || ''}
                onChange={(e) => handleAnswerChange(e.target.value)}
                style={{ resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.6 }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                <span>Comprehensive answers that explain concepts thoroughly achieve higher evaluation scores.</span>
                <span>{(answers[String(currentIndex)] || '').length} characters</span>
              </div>
            </div>

            {/* Previous / Next Controls */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--space-md)', borderTop: '1px solid var(--border-subtle)' }}>
              <Button
                variant="outline"
                size="sm"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              >
                ← Previous Question
              </Button>

              {currentIndex < questions.length - 1 ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setCurrentIndex((prev) => Math.min(questions.length - 1, prev + 1))}
                >
                  Next Question →
                </Button>
              ) : (
                <Button
                  variant="accent"
                  size="sm"
                  disabled={submitting}
                  onClick={handleSubmitAssessment}
                >
                  {submitting ? 'Evaluating...' : 'Submit Assessment'}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>
    );
  }

  // ─── STAGE 3: RESULTS & VERIFICATION SCREEN ──────────────────────────────────
  if (stage === 'results') {
    const passed = result?.passed;
    const scoreVal = parseFloat(result?.score || 0);

    return (
      <div style={{ padding: 'var(--space-2xl) 0' }}>
        <div className="content-wrapper" style={{ maxWidth: 760 }}>
          <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
            <div style={{ fontSize: '3.5rem', marginBottom: 'var(--space-xs)' }}>
              {passed ? '🏆' : '📚'}
            </div>
            <h2>Assessment Evaluation Report</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              Server-side deterministic evaluation completed.
            </p>
          </div>

          <Card style={{ borderLeft: `6px solid ${passed ? 'var(--success)' : 'var(--warning)'}`, marginBottom: 'var(--space-2xl)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--space-md)', marginBottom: 'var(--space-lg)' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Verification Status:</span>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: passed ? 'var(--accent-400)' : 'var(--warning)' }}>
                  {passed ? 'AI-VERIFIED EXPERT' : 'VERIFICATION PENDING (NOT PASSED)'}
                </div>
              </div>
              <Badge variant={passed ? 'verified' : 'danger'} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
                {result?.grade_label || (passed ? 'Proficient' : 'Needs Improvement')}
              </Badge>
            </div>

            {/* Score Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-md)', background: 'var(--bg-canvas)', padding: 'var(--space-lg)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-lg)' }}>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Final Score:</span>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: passed ? 'var(--accent-400)' : 'var(--warning)' }}>
                  {scoreVal.toFixed(1)}%
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Passing Threshold:</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 4 }}>
                  {result?.passing_score || 60}%
                </div>
              </div>
              <div>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>Questions Correct:</span>
                <div style={{ fontSize: '1.3rem', fontWeight: 700, marginTop: 4 }}>
                  {result?.correct_answers || 0} / {result?.total_questions || 10}
                </div>
              </div>
            </div>

            <div style={{ color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: 'var(--space-lg)' }}>
              {passed ? (
                <p>
                  Congratulations! You have passed the technical assessment with a score of <strong>{scoreVal.toFixed(1)}%</strong>.
                  Your account is now marked as <strong>AI-Verified</strong>. You can now submit competitive proposals across the marketplace.
                </p>
              ) : (
                <p>
                  You scored <strong>{scoreVal.toFixed(1)}%</strong>, which is below the 60% passing requirement.
                  You can review your core skills and retake the assessment from your workspace when ready.
                </p>
              )}
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-sm)', justifyContent: 'flex-end' }}>
              <Button variant="secondary" onClick={() => setStage('briefing')}>
                Review Guidelines
              </Button>
              <Button variant="primary" onClick={() => navigate('/freelancer/dashboard')}>
                Return to Freelancer Dashboard →
              </Button>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  return null;
}
