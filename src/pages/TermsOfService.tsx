import React from 'react';

export default function TermsOfService() {
  return (
    <div className="max-w-4xl mx-auto w-full glass-panel rounded-3xl p-8 sm:p-12 my-8">
      <h1 className="text-3xl font-black mb-8 text-slate-900 dark:text-white">이용약관</h1>
      <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
        <p><strong>제정일:</strong> 2026년 4월 19일</p>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">제 1 조 (목적)</h2>
          <p>이 약관은 Dancehive(이하 "회사")가 제공하는 제반 서비스의 이용과 관련하여 회사와 회원과의 권리, 의무 및 책임사항, 기타 필요한 사항을 규정함을 목적으로 합니다.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">제 2 조 (정의)</h2>
          <p>이 약관에서 사용하는 용어의 정의는 다음과 같습니다.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>"서비스"라 함은 구현되는 단말기(PC, 휴대형단말기 등의 각종 유무선 장치를 포함)와 상관없이 "회원"이 이용할 수 있는 Dancehive 관련 제반 서비스를 의미합니다.</li>
            <li>"회원"이라 함은 회사의 "서비스"에 접속하여 이 약관에 따라 "회사"와 이용계약을 체결하고 "회사"가 제공하는 "서비스"를 이용하는 고객을 말합니다.</li>
            <li>"주최자"라 함은 "서비스" 내에서 댄스 이벤트, 클럽, 모임 등을 개설하고 관리하는 회원을 말합니다.</li>
            <li>"참여자"라 함은 "주최자"가 개설한 이벤트에 참여를 신청하고 활동하는 회원을 말합니다.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">제 3 조 (약관의 게시와 개정)</h2>
          <p>① "회사"는 이 약관의 내용을 "회원"이 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.</p>
          <p>② "회사"는 "약관의 규제에 관한 법률", "정보통신망 이용촉진 및 정보보호 등에 관한 법률" 등 관련법을 위배하지 않는 범위에서 이 약관을 개정할 수 있습니다.</p>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">제 4 조 (서비스의 제공 등)</h2>
          <p>회사는 회원에게 아래와 같은 서비스를 제공합니다.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>댄스 관련 행사 개설 및 관리 도구 제공</li>
            <li>행사 참여 신청 및 참여자 상태 관리</li>
            <li>기타 "회사"가 추가 개발하거나 다른 회사와의 제휴계약 등을 통해 "회원"에게 제공하는 일체의 서비스</li>
          </ul>
        </section>

        <section>
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-200 mt-8 mb-4">제 5 조 (회원의 의무)</h2>
          <p>회원은 다음 행위를 하여서는 안 됩니다.</p>
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>신청 또는 변경 시 허위내용의 등록</li>
            <li>타인의 정보도용</li>
            <li>"회사"가 게시한 정보의 변경</li>
            <li>"회사"와 기타 제3자의 저작권 등 지적재산권에 대한 침해</li>
            <li>"회사" 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
