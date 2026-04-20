import React from 'react';

export default function PrivacyPolicy() {
  return (
    <div className="max-w-4xl mx-auto w-full glass-panel rounded-3xl p-8 sm:p-12 my-8">
      <h1 className="text-3xl font-black mb-8 text-slate-900 dark:text-white">개인정보처리방침</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
        <p><strong>시행일:</strong> 2026년 4월 19일</p>
        
        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">1. 수집하는 개인정보 항목</h2>
          <p>Dancehive('서비스')는 회원가입, 서비스 제공, 원활한 고객상담 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>필수항목: 이메일 주소, 비밀번호, 이름(또는 닉네임)</li>
            <li>선택항목: 휴대전화 번호, 프로필 사진</li>
            <li>자동수집항목: IP 주소, 쿠키, 서비스 이용 기록, 기기 정보</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">2. 개인정보의 수집 및 이용목적</h2>
          <p>회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>서비스 제공에 관한 계약 이행 및 요금 정산</li>
            <li>회원 관리 (본인확인, 개인식별, 불량회원의 부정 이용 방지와 비인가 사용 방지)</li>
            <li>이벤트 등 광고성 정보 전달 (선택 동의 시)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">3. 개인정보의 보유 및 이용기간</h2>
          <p>원칙적으로, 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">4. 개인정보의 파기절차 및 방법</h2>
          <p>회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다. 파기절차 및 방법은 다음과 같습니다.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong>전자적 파일 형태:</strong> 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제</li>
            <li><strong>종이 문서:</strong> 분쇄기로 분쇄하거나 소각하여 파기</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">5. 이용자 및 법정대리인의 권리와 그 행사방법</h2>
          <p>이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 가입해지를 요청할 수도 있습니다. 설정 메뉴를 통해 개인정보를 관리할 수 있으며, 관리자에게 문의하여 조치를 요구할 수 있습니다.</p>
        </section>

      </div>
    </div>
  );
}
